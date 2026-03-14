import { NextResponse } from 'next/server'

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️  TheVC / 혁신의숲은 모두 React SPA입니다.
//    단순 fetch로는 빈 HTML 껍데기만 받아옵니다 (JS 실행 전).
//    실제 데이터 수집에는 Playwright(헤드리스 브라우저)가 필요합니다.
//
//  로컬 개발 환경에서 Playwright를 사용하려면:
//    1. bun add -d playwright @playwright/test
//    2. npx playwright install chromium
//    3. 아래 scrapeWithPlaywright() 주석을 해제하고 사용하세요.
//
//  Vercel 서버리스 배포 시에는:
//    - @sparticuz/chromium + playwright-core 패키지 조합 사용
//    - 또는 Apify / BrightData 같은 외부 스크래핑 서비스 연동 권장
// ─────────────────────────────────────────────────────────────────────────────

// ─── 타입 ─────────────────────────────────────────────────────────────────────
export interface StartupInsights {
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
  _source?: string   // 디버그용: 데이터 출처
}

const EMPTY_INSIGHTS: StartupInsights = {
  vision: '',
  history: '',
  employee_count: 0,
  revenue: '',
  total_investment: '',
}

// ─── HTML 유틸 ────────────────────────────────────────────────────────────────
function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ').trim()
}

function cleanName(name: string): string {
  return name
    .replace(/^(주식회사\s*|\(주\)|\(유\)|\(사\)|\(재\))/g, '')
    .replace(/(\(주\)|\(유\)|\(사\)|\(재\)|\s*주식회사)$/g, '')
    .trim()
}

// ─── __NEXT_DATA__ 파싱 ───────────────────────────────────────────────────────
// Next.js SSR 앱은 HTML 내 <script id="__NEXT_DATA__"> 에 초기 데이터를 넣습니다.
// SPA라도 일부 페이지(회사 상세)는 SSR로 데이터를 포함하는 경우가 있습니다.
function extractNextData(html: string): any | null {
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
  if (!m) return null
  try { return JSON.parse(m[1]) } catch { return null }
}

// ─── TheVC 스크래퍼 ───────────────────────────────────────────────────────────
// TheVC(thevc.kr)는 Next.js SPA — 단순 fetch는 빈 HTML 반환.
// 현재는 __NEXT_DATA__ 파싱을 시도하고, 없으면 실패 처리합니다.
//
// ✅ Playwright 전환 방법 (로컬):
//   const { chromium } = await import('playwright')
//   const browser = await chromium.launch({ headless: true })
//   const page = await browser.newPage()
//   await page.goto(`https://thevc.kr/search?q=${encodeURIComponent(name)}`)
//   await page.waitForSelector('.company-card', { timeout: 5000 })
//   const html = await page.content()
//   await browser.close()

const THEVC_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'ko-KR,ko;q=0.9',
  Referer: 'https://thevc.kr/',
}

async function scrapeTheVC(companyName: string): Promise<Partial<StartupInsights>> {
  const name = cleanName(companyName)

  // Step 1: 검색 페이지 fetch (Next.js SSR이면 __NEXT_DATA__ 포함 가능)
  const searchRes = await fetch(
    `https://thevc.kr/search?keyword=${encodeURIComponent(name)}`,
    { headers: THEVC_HEADERS, signal: AbortSignal.timeout(6000) }
  )
  const searchHtml = await searchRes.text()
  const nextData = extractNextData(searchHtml)

  // __NEXT_DATA__에서 검색 결과 추출 시도
  const companies: any[] =
    nextData?.props?.pageProps?.searchResult?.companies ??
    nextData?.props?.pageProps?.companies ??
    nextData?.props?.pageProps?.data?.companies ??
    []

  if (!companies.length) throw new Error('TheVC: 검색 결과 없음 (SPA 렌더링 필요)')

  const company = companies.find((c: any) =>
    (c.name ?? '').includes(name) || name.includes(c.name ?? '')
  ) ?? companies[0]

  // Step 2: 회사 상세 페이지 fetch
  const slug: string = company.slug ?? company.id ?? ''
  if (!slug) throw new Error('TheVC: slug 없음')

  const profileRes = await fetch(
    `https://thevc.kr/${slug}`,
    { headers: THEVC_HEADERS, signal: AbortSignal.timeout(6000) }
  )
  const profileHtml = await profileRes.text()
  const profileData = extractNextData(profileHtml)
  const detail = profileData?.props?.pageProps?.company ?? profileData?.props?.pageProps ?? {}
  const plain = stripTags(profileHtml)

  // 데이터 추출
  const vision: string =
    detail.description ?? detail.intro ?? detail.tagline ??
    profileHtml.match(/<meta name="description" content="([^"]{10,300})"/i)?.[1] ?? ''

  const foundYear = plain.match(/설립\s*(\d{4})/) ?? plain.match(/(\d{4})\s*년\s*설립/)
  let history = foundYear ? `${foundYear[1]}년 설립` : (detail.foundedYear ? `${detail.foundedYear}년 설립` : '')
  const seriesM = plain.match(/(시리즈\s*[A-Z]|Series\s*[A-Z]|Seed|씨드)[^.]{0,60}(억|만원)/i)
  if (seriesM) history += (history ? ', ' : '') + seriesM[0].replace(/\s+/g, ' ').trim()

  const employee_count: number = detail.employeeCount ?? detail.employees ?? 0

  let total_investment = ''
  const inv = detail.totalInvestment ?? detail.investAmount ?? 0
  if (inv > 0) total_investment = inv > 100_000_000 ? `${Math.round(inv / 100_000_000)}억원` : `${inv.toLocaleString()}원`

  return { vision, history, employee_count, total_investment }
}

// ─── 혁신의숲 스크래퍼 ────────────────────────────────────────────────────────
// 혁신의숲(innoforest.co.kr)도 SPA — 마찬가지로 __NEXT_DATA__ 파싱 시도.
//
// ✅ Playwright 전환 방법 (로컬):
//   await page.goto(`https://www.innoforest.co.kr/company/search?keyword=${name}`)
//   await page.waitForSelector('[class*="CompanyCard"]', { timeout: 5000 })
//   // 첫 번째 회사 클릭 후 상세 페이지에서 데이터 추출

const INNO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'ko-KR,ko;q=0.9',
  Referer: 'https://www.innoforest.co.kr/',
}

async function scrapeInnoforest(companyName: string): Promise<Partial<StartupInsights>> {
  const name = cleanName(companyName)

  const searchRes = await fetch(
    `https://www.innoforest.co.kr/company/search?keyword=${encodeURIComponent(name)}`,
    { headers: INNO_HEADERS, signal: AbortSignal.timeout(6000) }
  )
  const searchHtml = await searchRes.text()
  const nextData = extractNextData(searchHtml)

  const list: any[] =
    nextData?.props?.pageProps?.companyList ??
    nextData?.props?.pageProps?.companies ??
    nextData?.props?.pageProps?.data ??
    []

  if (!list.length) throw new Error('혁신의숲: 검색 결과 없음 (SPA 렌더링 필요)')

  const company = list.find((c: any) =>
    (c.companyName ?? c.name ?? '').includes(name)
  ) ?? list[0]

  const vision: string = company.description ?? company.intro ?? company.oneLineDesc ?? ''
  const history: string = company.foundedYear ? `${company.foundedYear}년 설립` : ''
  const employee_count: number = Number(company.employeeCount ?? company.employees ?? 0)

  let total_investment = ''
  const rawInv = company.totalInvestment ?? company.investmentAmount ?? 0
  if (rawInv) {
    total_investment = rawInv > 100_000_000 ? `${Math.round(rawInv / 100_000_000)}억원` : `${rawInv.toLocaleString()}원`
  }

  const revenue: string = company.revenue
    ? company.revenue > 100_000_000
      ? `${Math.round(company.revenue / 100_000_000)}억원`
      : `${company.revenue.toLocaleString()}원`
    : ''

  return { vision, history, employee_count, total_investment, revenue }
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
  let source = ''

  // 1차: TheVC
  try {
    const thevc = await scrapeTheVC(companyName)
    insights = { ...insights, ...thevc }
    source = 'thevc'
    console.log('[startup-info] TheVC 성공:', companyName)
  } catch (e) {
    console.error('[startup-info] TheVC 실패:', String(e))
  }

  // 2차: 혁신의숲 (빈 필드 보완)
  const needsMore = !insights.vision || !insights.total_investment || !insights.revenue
  if (needsMore) {
    try {
      const inno = await scrapeInnoforest(companyName)
      if (!insights.vision && inno.vision) insights.vision = inno.vision
      if (!insights.history && inno.history) insights.history = inno.history
      if (!insights.employee_count && inno.employee_count) insights.employee_count = inno.employee_count
      if (!insights.total_investment && inno.total_investment) insights.total_investment = inno.total_investment
      if (!insights.revenue && inno.revenue) insights.revenue = inno.revenue
      source = source ? `${source}+innoforest` : 'innoforest'
      console.log('[startup-info] 혁신의숲 성공:', companyName)
    } catch (e) {
      console.error('[startup-info] 혁신의숲 실패:', String(e))
    }
  }

  const hasAnyData =
    !!insights.vision || !!insights.history || !!insights.revenue ||
    !!insights.total_investment || insights.employee_count > 0

  return NextResponse.json<StartupInfoResponse>({
    success: hasAnyData,
    data: { company_name: companyName, insights },
    _source: source || 'none',
  })
}
