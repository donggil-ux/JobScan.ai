import { NextResponse } from 'next/server'

// ─── 타입 정의 ────────────────────────────────────────────────────────────────
interface StartupInsights {
  vision: string
  history: string
  employee_count: number
  revenue: string
  total_investment: string
}

interface StartupInfoResponse {
  success: boolean
  data: {
    company_name: string
    insights: StartupInsights
  }
}

const EMPTY_INSIGHTS: StartupInsights = {
  vision: '',
  history: '',
  employee_count: 0,
  revenue: '',
  total_investment: '',
}

// ─── 요청 헤더 ────────────────────────────────────────────────────────────────
const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
}

// ─── HTML 유틸 ────────────────────────────────────────────────────────────────
function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// ─── TheVC 스크래핑 ───────────────────────────────────────────────────────────
// NOTE: Playwright로 교체하려면 아래 fetch 호출을 다음과 같이 대체하세요.
//   const browser = await chromium.launch({ headless: true })
//   const page = await browser.newPage()
//   await page.goto(url)
//   const html = await page.content()
//   await browser.close()
// Vercel serverless 환경에서는 fetch + HTML 파싱 방식을 사용합니다.

async function scrapeTheVC(companyName: string): Promise<StartupInfoResponse['data']> {
  // Step 1: 검색 페이지에서 회사 slug 추출
  const searchUrl = `https://thevc.kr/search?keyword=${encodeURIComponent(companyName)}`
  const searchRes = await fetch(searchUrl, {
    headers: BROWSER_HEADERS,
    signal: AbortSignal.timeout(5000),
  })
  if (!searchRes.ok) throw new Error(`TheVC search ${searchRes.status}`)
  const searchHtml = await searchRes.text()

  // 검색 결과에서 회사명과 일치하는 첫 번째 링크 slug 추출
  // TheVC 검색 결과: href="/company-slug" 형태
  const slugRe = /href="\/([a-z0-9][a-z0-9-]{1,60})"[^>]*>[\s\S]{0,200}?/gi
  let slug = ''
  let m: RegExpExecArray | null

  // 1순위: 정확히 회사명이 포함된 링크
  const plain = searchHtml.toLowerCase()
  const nameLC = companyName.toLowerCase()
  const linkRe = /href="\/([a-z0-9][a-z0-9-]{1,60})"/gi
  while ((m = linkRe.exec(searchHtml)) !== null) {
    const candidate = m[1]
    // 시스템 경로 제외
    if (['search', 'login', 'signup', 'about', 'faq', 'terms', 'privacy'].includes(candidate)) continue
    // 해당 링크 주변 텍스트에서 회사명 확인 (앞뒤 300자)
    const surrounding = plain.slice(Math.max(0, m.index - 50), m.index + 300)
    if (surrounding.includes(nameLC)) {
      slug = candidate
      break
    }
  }

  // 2순위: 첫 번째 유효한 링크
  if (!slug) {
    const firstRe = /href="\/([a-z0-9][a-z0-9-]{1,60})"/i
    const fm = searchHtml.match(firstRe)
    if (fm) {
      const candidate = fm[1]
      if (!['search', 'login', 'signup', 'about', 'faq', 'terms', 'privacy'].includes(candidate)) {
        slug = candidate
      }
    }
  }

  if (!slug) throw new Error('TheVC: slug not found')

  // Step 2: 회사 프로필 페이지 파싱
  const profileUrl = `https://thevc.kr/${slug}`
  const profileRes = await fetch(profileUrl, {
    headers: BROWSER_HEADERS,
    signal: AbortSignal.timeout(5000),
  })
  if (!profileRes.ok) throw new Error(`TheVC profile ${profileRes.status}`)
  const profileHtml = await profileRes.text()
  const profilePlain = stripTags(profileHtml)

  // vision: meta description 우선, 없으면 og:description
  let vision = ''
  const metaDesc = profileHtml.match(/<meta\s+name="description"\s+content="([^"]{10,300})"/i)
  if (metaDesc) {
    vision = metaDesc[1].trim()
  } else {
    const ogDesc = profileHtml.match(/<meta\s+property="og:description"\s+content="([^"]{10,300})"/i)
    if (ogDesc) vision = ogDesc[1].trim()
  }

  // history: 설립연도 + 투자 라운드 텍스트 조합
  let history = ''
  const foundYear = profilePlain.match(/설립\s*(\d{4})\s*년/)
    ?? profilePlain.match(/(\d{4})\s*년\s*설립/)
    ?? profilePlain.match(/Founded\s+in\s+(\d{4})/i)
  if (foundYear) history += `${foundYear[1]}년 설립`

  const seriesMatch = profilePlain.match(/(시리즈\s*[A-Z]|Series\s*[A-Z]|Pre-[A-Z]|Seed|씨드)\s*[^.]{0,50}(억|만원|달러|USD)/i)
  if (seriesMatch) {
    history += (history ? ', ' : '') + seriesMatch[0].replace(/\s+/g, ' ').trim()
  }

  // employee_count: "임직원 N명", "직원 수 N명" 패턴
  let employee_count = 0
  const empMatch = profilePlain.match(/(?:임직원|직원\s*수|employees?)\s*[:\s]?\s*([0-9,]+)\s*명/i)
  if (empMatch) {
    employee_count = parseInt(empMatch[1].replace(/,/g, ''))
  }

  // revenue: 매출 관련 숫자
  let revenue = ''
  const revMatch = profilePlain.match(/매출[^\d]{0,10}([0-9,]+\s*억[원]?)/i)
    ?? profilePlain.match(/([0-9,]+\s*억[원]?)[^\d]{0,20}매출/i)
  if (revMatch) revenue = revMatch[1].replace(/\s/g, '')

  // total_investment: 누적/총 투자금액
  let total_investment = ''
  const invMatch = profilePlain.match(/(?:누적|총)\s*투자[^0-9]{0,20}([0-9,]+\s*억[원]?)/i)
    ?? profilePlain.match(/([0-9,]+\s*억[원]?)[^0-9]{0,20}(?:누적|총)\s*투자/i)
    ?? profilePlain.match(/투자\s*유치[^0-9]{0,20}([0-9,]+\s*억[원]?)/i)
  if (invMatch) total_investment = invMatch[1].replace(/\s/g, '')

  return {
    company_name: companyName,
    insights: { vision, history, employee_count, revenue, total_investment },
  }
}

// ─── 혁신의숲 스크래핑 (TheVC 실패 시 fallback) ──────────────────────────────
// NOTE: Playwright로 교체하려면 scrapeTheVC()의 주석과 동일한 방식으로 교체하세요.

async function scrapeInnoforest(companyName: string): Promise<StartupInfoResponse['data']> {
  const searchUrl = `https://innoforest.co.kr/company/search?keyword=${encodeURIComponent(companyName)}`
  const searchRes = await fetch(searchUrl, {
    headers: BROWSER_HEADERS,
    signal: AbortSignal.timeout(5000),
  })
  if (!searchRes.ok) throw new Error(`Innoforest search ${searchRes.status}`)
  const html = await searchRes.text()
  const plain = stripTags(html)

  // JSON-LD에서 구조화 데이터 추출 시도
  let vision = ''
  const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i)
  if (jsonLd) {
    try {
      const obj = JSON.parse(jsonLd[1])
      vision = obj.description ?? obj.name ?? ''
    } catch {
      // 파싱 실패 시 무시
    }
  }

  // meta description fallback
  if (!vision) {
    const metaMatch = html.match(/<meta\s+name="description"\s+content="([^"]{10,300})"/i)
    if (metaMatch) vision = metaMatch[1].trim()
  }

  // 설립연도
  let history = ''
  const foundYear = plain.match(/설립\s*(\d{4})/) ?? plain.match(/(\d{4})\s*년\s*설립/)
  if (foundYear) history = `${foundYear[1]}년 설립`

  // 직원수
  let employee_count = 0
  const empMatch = plain.match(/(?:임직원|직원)\s*[:\s]?\s*([0-9,]+)\s*명/i)
  if (empMatch) employee_count = parseInt(empMatch[1].replace(/,/g, ''))

  // 투자
  let total_investment = ''
  const invMatch = plain.match(/누적\s*투자[^0-9]{0,20}([0-9,]+\s*억)/i)
  if (invMatch) total_investment = invMatch[1].replace(/\s/g, '')

  return {
    company_name: companyName,
    insights: { vision, history, employee_count, revenue: '', total_investment },
  }
}

// ─── Route Handler ────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const companyName = (searchParams.get('companyName') ?? '').trim()

  if (!companyName) {
    return NextResponse.json<StartupInfoResponse>({
      success: false,
      data: { company_name: '', insights: EMPTY_INSIGHTS },
    })
  }

  // 1차 시도: TheVC
  try {
    const data = await scrapeTheVC(companyName)
    return NextResponse.json<StartupInfoResponse>({ success: true, data })
  } catch {
    // TheVC 실패 → 혁신의숲 시도
  }

  // 2차 시도: 혁신의숲
  try {
    const data = await scrapeInnoforest(companyName)
    return NextResponse.json<StartupInfoResponse>({ success: true, data })
  } catch {
    // 둘 다 실패 → 빈 데이터로 안전하게 응답
  }

  return NextResponse.json<StartupInfoResponse>({
    success: false,
    data: { company_name: companyName, insights: EMPTY_INSIGHTS },
  })
}
