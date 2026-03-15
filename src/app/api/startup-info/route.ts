import { NextResponse } from 'next/server'

// ─── 타입 ─────────────────────────────────────────────────────────────────────
export interface StartupInsights {
  vision: string
  history: string
  employee_count: number
  revenue: string
  total_investment: string
  company_age: string    // 업력 N년차
  company_type: string   // 기업형태 (스타트업, 중소기업 등)
}

interface StartupInfoResponse {
  success: boolean
  data: {
    company_name: string
    insights: StartupInsights
  }
  _source?: string
}

const EMPTY_INSIGHTS: StartupInsights = {
  vision: '',
  history: '',
  employee_count: 0,
  revenue: '',
  total_investment: '',
  company_age: '',
  company_type: '',
}

// ─── HTML 유틸 ────────────────────────────────────────────────────────────────
function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ').trim()
}

// ─── 사람인 요청 헤더 ─────────────────────────────────────────────────────────
const SARAMIN_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9',
  Referer: 'https://www.saramin.co.kr/',
}

// ─── Step 1: 회사명으로 사람인 채용공고 검색 → CSN 추출 ───────────────────────
async function fetchSaraminCSN(companyName: string): Promise<string | null> {
  const url =
    `https://www.saramin.co.kr/zf_user/search/recruit` +
    `?searchType=search&searchword=${encodeURIComponent(companyName)}&recruitPageCount=5`

  const res = await fetch(url, {
    headers: SARAMIN_HEADERS,
    signal: AbortSignal.timeout(3000),
  })
  if (!res.ok) return null

  const html = await res.text()

  // 첫 번째 item_recruit 블록에서 company-info CSN 추출
  const chunks = html.split('<div class="item_recruit"')
  if (chunks.length < 2) return null

  const firstChunk = chunks[1]
  const csnMatch = firstChunk.match(/href="\/zf_user\/company-info\/view\?csn=([^"&]+)/)
  if (!csnMatch) return null

  return decodeURIComponent(csnMatch[1])
}

// ─── Step 2: CSN으로 사람인 기업정보 페이지 파싱 ─────────────────────────────
async function scrapeSaraminCompany(csn: string): Promise<Partial<StartupInsights>> {
  const url = `https://www.saramin.co.kr/zf_user/company-info/view?csn=${encodeURIComponent(csn)}`

  const res = await fetch(url, {
    headers: SARAMIN_HEADERS,
    signal: AbortSignal.timeout(4000),
  })
  if (!res.ok) return {}

  const html = await res.text()
  const result: Partial<StartupInsights> = {}

  // JSON-LD 파싱 (사람인 페이지에 Schema.org 데이터 포함)
  try {
    const jsonLdM = html.match(/<script type="application\/ld\+json">([\s\S]+?)<\/script>/)
    if (jsonLdM) {
      const ld = JSON.parse(jsonLdM[1])
      // 임직원 수
      const empVal = ld?.numberOfEmployees?.value ?? ld?.numberOfEmployees ?? null
      if (empVal) {
        result.employee_count = parseInt(String(empVal).replace(/,/g, ''), 10) || 0
      }
    }
  } catch { /* skip */ }

  // 매출액 — HTML summary 섹션에서 추출
  try {
    // desc → tit 순서 (레이블 먼저, 값 나중)
    const revM = html.match(/<p class="company_summary_desc">매출액<\/p>[\s\S]{0,200}?<strong class="company_summary_tit">\s*([^<\n]{2,40})<\/strong>/)
    if (revM) {
      result.revenue = revM[1].trim()
    } else {
      // tit → desc 순서도 시도
      const revM2 = html.match(/<strong class="company_summary_tit">\s*([^<\n]{2,40})<\/strong>[\s\S]{0,200}?<p class="company_summary_desc">매출액<\/p>/)
      if (revM2) result.revenue = revM2[1].trim()
    }
  } catch { /* skip */ }

  // 설립일 (history)
  try {
    const histM = html.match(/<p class="company_summary_desc">(\d{4}년[^<]*설립)<\/p>/)
    if (histM) result.history = histM[1].trim()
  } catch { /* skip */ }

  // 기업 비전/소개
  try {
    // 1차: 기업비전 섹션 내 본문
    const visionM = html.match(
      /기업비전[\s\S]{0,200}?<p class="txt">([\s\S]+?)<\/p>/
    )
    if (visionM) {
      result.vision = stripTags(visionM[1]).slice(0, 500)
    } else {
      // 2차: 첫 번째 company_introduce 슬로건
      const introM = html.match(/class="company_introduce"[\s\S]{0,300}?<strong class="tit">([^<]+)<\/strong>/)
      if (introM) result.vision = stripTags(introM[1]).slice(0, 500)
    }
  } catch { /* skip */ }

  // 업력 / 기업형태 — 메타 description에서 추출
  // 예: "업력 : 14년차, 기업형태 : 스타트업, 업종 : ..."
  try {
    const metaDesc = html.match(/<meta name="Description" content="([^"]{10,500})"/i)?.[1] ?? ''
    const ageM = metaDesc.match(/업력\s*:\s*(\d+년차)/)
    if (ageM) result.company_age = ageM[1]

    const typeM = metaDesc.match(/기업형태\s*:\s*([^,<"]+)/)
    if (typeM) result.company_type = typeM[1].trim()
  } catch { /* skip */ }

  // total_investment: 사람인에 해당 정보 없음
  result.total_investment = ''

  return result
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

  let insights: StartupInsights = { ...EMPTY_INSIGHTS }

  try {
    const csn = await fetchSaraminCSN(companyName)
    if (!csn) throw new Error('사람인: CSN 없음 (공고 없거나 검색 실패)')

    const saramin = await scrapeSaraminCompany(csn)
    insights = { ...insights, ...saramin }
    console.log('[startup-info] 사람인 성공:', companyName, saramin)
  } catch (e) {
    console.error('[startup-info] 사람인 실패:', String(e))
  }

  const hasAnyData =
    !!insights.vision || !!insights.history || !!insights.revenue ||
    insights.employee_count > 0

  return NextResponse.json<StartupInfoResponse>({
    success: hasAnyData,
    data: { company_name: companyName, insights },
    _source: hasAnyData ? 'saramin' : 'none',
  })
}
