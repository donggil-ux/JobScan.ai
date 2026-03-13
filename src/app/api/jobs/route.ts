import { NextResponse } from 'next/server'
import type { Job, CompanySize, EmploymentType } from '@/types/job'

// ─── Wanted 요청 헤더 ───────────────────────────────────────────────────────
const WANTED_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'ko-KR,ko;q=0.9',
  Referer:
    'https://www.wanted.co.kr/search?query=%ED%94%84%EB%A1%9C%EB%8D%95%ED%8A%B8+%EB%94%94%EC%9E%90%EC%9D%B4%EB%84%88',
  Origin: 'https://www.wanted.co.kr',
  'x-wanted-language': 'ko',
}

// ─── Saramin 요청 헤더 ───────────────────────────────────────────────────────
const SARAMIN_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9',
  Referer: 'https://www.saramin.co.kr/',
}

// ─── Remember 요청 헤더 ──────────────────────────────────────────────────────
const REMEMBER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'application/json',
  'Accept-Language': 'ko-KR,ko;q=0.9',
  Referer: 'https://career.rememberapp.co.kr/',
  Origin: 'https://career.rememberapp.co.kr',
}

// Remember job_category_ids for design roles (UX·UI·Product·Brand·Web)
// Discovered via network inspection: 376=브랜드, 377=제품디자인, 378·379·380·381=웹/UI, 393=UX
const REMEMBER_DESIGN_CAT_IDS = [376, 377, 378, 379, 380, 381, 393]

// ─── Jobkorea 요청 헤더 ──────────────────────────────────────────────────────
const JOBKOREA_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9',
  Referer: 'https://www.jobkorea.co.kr/',
}

// ─── 공용 헬퍼 ──────────────────────────────────────────────────────────────

// 기업 규모 휴리스틱
const LARGE_CORPS = [
  '카카오', '네이버', '삼성', 'LG전자', 'SK텔레콤', 'SK하이닉스', '현대자동차', 'KT',
  '롯데', 'CJ', '하이브', '쿠팡', '배달의민족', '라인플러스', '카카오뱅크', '카카오페이',
  '토스', '비바리퍼블리카', '당근마켓', 'KRAFTON', '크래프톤',
]
const MID_CORPS = [
  '넥슨', '엔씨소프트', '넷마블', 'NHN', '컴투스', '펄어비스', '스마일게이트',
  '카카오게임즈', '위메이드', '무신사', '29CM', '오늘의집', '마켓컬리', '야놀자', '직방',
  '하나금융', '신한', '메리츠',
]

function getCompanySize(name: string): CompanySize {
  if (LARGE_CORPS.some((c) => name.includes(c))) return '대기업'
  if (MID_CORPS.some((c) => name.includes(c))) return '중견기업'
  return '중소/스타트업'
}

// position 텍스트에서 경력 최솟값 추출
function parseMinYears(position: string): number {
  const m5 = position.match(/(\d+)\s*년\s*(이상|~)/)
  if (m5) return parseInt(m5[1])
  if (/시니어|senior|lead|principal|헤드|head/i.test(position)) return 5
  return 5 // 기본값 (5년+ 포지션 대상이므로)
}

// job_id 기반 결정론적 점수 (새로고침해도 동일, 65~95)
function getMatchScore(id: number, likeCount: number): number {
  const idVariance = id % 31 // 0~30 범위의 결정론적 값
  const likeBonus = Math.min(Math.floor(likeCount / 5), 5) // 최대 5점
  return Math.min(95, 65 + idVariance + likeBonus)
}

// 포지션 제목에서 디자인 관련 태그 추출
function extractTags(position: string, industryName: string): string[] {
  const tags: string[] = []
  if (/UI[·\/]?UX|UX[·\/]?UI/i.test(position)) tags.push('#UX/UI')
  else if (/UX/i.test(position)) tags.push('#UX')
  if (/Figma/i.test(position)) tags.push('#Figma')
  if (/디자인\s*시스템|design\s*system/i.test(position)) tags.push('#디자인시스템')
  if (/B2B/i.test(position)) tags.push('#B2B')
  if (/B2C/i.test(position)) tags.push('#B2C')
  if (/모바일|앱|app/i.test(position)) tags.push('#모바일')
  if (/웹|web/i.test(position)) tags.push('#웹')
  if (/리드|lead|헤드|head/i.test(position)) tags.push('#리드급')
  if (/시니어|senior/i.test(position)) tags.push('#시니어')
  if (/principal/i.test(position)) tags.push('#Principal')
  if (/AI|인공지능/i.test(position)) tags.push('#AI')
  if (/핀테크|fintech|금융|증권|보험/i.test(position + industryName)) tags.push('#핀테크')
  if (/커머스|이커머스|e-commerce/i.test(position + industryName)) tags.push('#커머스')
  if (/게임/i.test(position + industryName)) tags.push('#게임')
  // 기본 태그: 비어있으면 추가
  if (tags.length === 0) tags.push('#UX', '#Figma')
  return tags.slice(0, 4)
}

// ─── Wanted ─────────────────────────────────────────────────────────────────

// Wanted 리스팅 아이템 → Job 타입으로 변환
function toWantedJob(item: any): Job {
  const minYears = parseMinYears(item.position ?? '')
  const deadline: string | null = item.due_time
    ? String(item.due_time).slice(0, 10)
    : null
  const industryName: string = item.company?.industry_name ?? ''

  return {
    job_id: `wanted_${item.id}`,
    source_platform: 'wanted',
    company: {
      name: item.company?.name ?? '–',
      logo_url: item.logo_img?.thumb ?? '',
      company_size: getCompanySize(item.company?.name ?? ''),
    },
    position: {
      title: item.position,
      url: `https://www.wanted.co.kr/wd/${item.id}`,
    },
    employment_type: '정규직' as EmploymentType,
    experience_req: { min_years: minYears, max_years: null },
    tags: extractTags(item.position ?? '', industryName),
    deadline,
    match_score: getMatchScore(item.id, item.like_count ?? 0),
  }
}

// 원티드 API에서 페이지 1개 fetch
async function fetchWantedPage(query: string, offset: number, limit: number): Promise<any[]> {
  const params = new URLSearchParams({
    job_sort: 'job.latest_order',
    country: 'kr',
    query,
    limit: String(limit),
    offset: String(offset),
  })
  const url = `https://www.wanted.co.kr/api/v4/jobs?${params}`
  const res = await fetch(url, { headers: WANTED_HEADERS, next: { revalidate: 1800 } })
  if (!res.ok) throw new Error(`Wanted API ${res.status}`)
  const json = await res.json()
  return Array.isArray(json?.data) ? json.data : []
}

// ─── Remember ────────────────────────────────────────────────────────────────

// Remember 리스팅 아이템 → Job 타입으로 변환
// "(주)", "(유)", "(사)" 등 법인 형태 표기 제거
function cleanCompanyName(name: string): string {
  return name
    .replace(/^(주식회사\s*|\(주\)|\(유\)|\(사\)|\(재\))/g, '') // prefix
    .replace(/(\(주\)|\(유\)|\(사\)|\(재\)|\s*주식회사)$/g, '') // suffix
    .trim()
}

function toRememberJob(item: any): Job {
  const org = item.organization ?? {}
  const rawName: string = org.name ?? item.company?.name ?? '–'
  const companyName = cleanCompanyName(rawName)
  const minYears: number = typeof item.min_experience === 'number' ? item.min_experience : 5
  const deadline: string | null = item.ends_at
    ? String(item.ends_at).slice(0, 10)
    : null

  return {
    job_id: `remember_${item.id}`,
    source_platform: 'remember',
    company: {
      name: companyName,
      logo_url: org.logo ?? item.company?.logo ?? '',
      company_size: getCompanySize(companyName),
    },
    position: {
      title: item.title ?? '–',
      url: `https://career.rememberapp.co.kr/job/posting/${item.id}`,
    },
    employment_type: '정규직' as EmploymentType,
    experience_req: {
      min_years: minYears,
      max_years: typeof item.max_experience === 'number' ? item.max_experience : null,
    },
    tags: extractTags(item.title ?? '', ''),
    deadline,
    match_score: getMatchScore(item.id, 0),
  }
}

// ─── 관련성 필터 ─────────────────────────────────────────────────────────────
// 1단계: 명확히 관련 있는 키워드 → 항상 통과 (블록리스트보다 우선)
const REMEMBER_ALLOW_PATTERNS = [
  /프로덕트\s*디자이너|Product\s*Designer/i,
  /UX\s*(디자이너|Designer|Researcher|Research)/i,
  /UI\s*[/·]?\s*UX|UX\s*[/·]?\s*UI/i,
  /서비스\s*디자이너/i,
  /디자인\s*시스템/i,
]

// 2단계: 명백히 비관련 키워드 → 제외
const REMEMBER_BLOCK_PATTERNS = [
  /인턴|intern/i,                             // 인턴 (한/영)
  /주니어|Jr\./i,                             // 주니어
  /사원[-·~]주임|주임급|사원급/i,              // 사원/주임 직급
  /1[~-]3년\s*이하/i,                         // 경력 1~3년 이하
  /신입[~·\/\s]*\d+년[차]?/i,                // 신입~3년차, 신입~5년 등 범위 표기
  /신입[\/·]\s*경력/i,                        // 신입/경력 병렬 채용 (신입도 OK → 시니어 무관)
  /[0-3]년[차]?\s*(이하|미만|까지)/i,         // 3년 이하 / 3년차 미만 / 3년까지
  /경력\s*[0-3]년\s*(이하|미만)/i,            // 경력 3년 이하 / 경력 2년 미만
  /광고/i,                                    // 광고대행, 광고회사
  /그래픽\s*디자이너/i,
  /영상\s*디자이너/i,
  /모션\s*디자이너/i,
  /패션\s*디자이너/i,
  /인테리어\s*디자이너/i,
  /편집\s*디자이너/i,
  /패키지\s*디자이너/i,
  /VMD/i,
  /3D\s*디자이너/i,
  /썸네일|배너\s*디자이너|디자이너.*배너/i,    // 썸네일/배너 디자이너
  /퍼블리셔|퍼블리싱/i,                       // 웹 퍼블리셔
  /캐릭터.*디자이너|Character.*디자이너/i,
  /마케팅\s*디자이너/i,
  /콘텐츠\s*디자이너|컨텐츠\s*디자이너/i,
  /웹\s*디자이너|웹디자인\s*담당/i,            // 단순 웹디자이너/웹디자인 담당자 (UX/UI 없는 경우)
  /기획자/i,                                  // 서비스기획자, UX기획자 등 기획 직군
  /상품\s*기획|제품\s*기획|브랜드\s*기획/i,
  /앨범/i,                                    // 앨범 디자인 (엔터테인먼트)
  /신발|의류\s*디자이너/i,                    // 패션/산업 디자인
  /BM\s*\/|\/\s*BM/i,
  /\bBX\b/i,                                 // BX (Brand Experience) 디자이너
  /Brand\s*Experience/i,                     // Brand Experience 포지션
  /Brand\s*Designer/i,                       // Brand Designer (영문)
  /개발자/i,                                  // 프론트엔드·앱·iOS 개발자 등 (디자이너 아님)
  /상품\s*디자이너/i,                         // 패션·공산품 상품디자이너 (프로덕트 디자이너와 구별)
]

// 헤드헌팅·인력파견 회사 제외 (회사명 기준, 전 플랫폼 공통)
const COMPANY_BLOCK_PATTERNS = [
  /프로써치|Pro\s*Search/i,
  /맨파워|Manpower/i,
]

function isRelevantDesignJob(title: string): boolean {
  // 1. 명확히 관련 키워드 → 항상 통과 (블록보다 우선)
  if (REMEMBER_ALLOW_PATTERNS.some((p) => p.test(title))) return true
  // 2. 명백히 비관련 키워드 → 제외
  if (REMEMBER_BLOCK_PATTERNS.some((p) => p.test(title))) return false
  // 3. "브랜드" 포함 포지션 전체 제외 (allowlist 통과한 경우는 이미 위에서 return)
  if (/브랜드/i.test(title)) return false
  return true
}

// ─── 사람인 전용 관련성 필터 ─────────────────────────────────────────────────
// 사람인 키워드 검색은 결과가 넓어서 개발자·엔지니어·영업 등이 다수 혼입됨.
// 제목에 명시적인 디자인 키워드가 없으면 즉시 제외 (allow→block 순 적용).
const SARAMIN_MUST_HAVE = [
  /디자이너/,           // 프로덕트 디자이너, UX 디자이너 …
  /Designer/i,          // Product Designer (영문)
  /UX\s*Research/i,     // UX Researcher
  /Head\s*of\s*Design/i,
  /Design\s*(Lead|Head|Director|Manager)/i,
  /디자인\s*(리드|팀장|헤드|디렉터|매니저|시스템|파트장)/,
]

function isSaraminDesignJob(title: string): boolean {
  // 1. 제목에 디자인 키워드 없으면 즉시 제외
  if (!SARAMIN_MUST_HAVE.some((p) => p.test(title))) return false
  // 2. 공통 블록 패턴 적용
  if (REMEMBER_BLOCK_PATTERNS.some((p) => p.test(title))) return false
  // 3. 브랜드 포지션 제외 (allow 패턴 통과 제외)
  if (/브랜드/i.test(title) && !REMEMBER_ALLOW_PATTERNS.some((p) => p.test(title))) return false
  return true
}

// 리멤버 career-api에서 디자인 직군 공고 fetch
async function fetchRememberPage(page: number, limit: number): Promise<any[]> {
  const params = new URLSearchParams({ per: String(limit), page: String(page) })
  REMEMBER_DESIGN_CAT_IDS.forEach((id) => params.append('job_category_ids[]', String(id)))

  const url = `https://career-api.rememberapp.co.kr/job_postings?${params}`
  const res = await fetch(url, { headers: REMEMBER_HEADERS, next: { revalidate: 1800 } })
  if (!res.ok) throw new Error(`Remember API ${res.status}`)
  const json = await res.json()
  return Array.isArray(json?.data) ? json.data : []
}

// ─── Saramin ──────────────────────────────────────────────────────────────────

// 사람인 검색 결과 HTML → 공고 배열 파싱
function parseSaraminHTML(html: string): Array<{
  id: string
  title: string
  url: string
  companyName: string
  conditions: string[]
  deadline: string | null
}> {
  const results: ReturnType<typeof parseSaraminHTML> = []

  // item_recruit 블록 단위로 분리 (value="REC_ID" 기준)
  const chunks = html.split('<div class="item_recruit" value="')
  chunks.shift() // 첫 번째는 블록 이전 헤더

  for (const chunk of chunks) {
    const idMatch = chunk.match(/^(\d+)"/)
    if (!idMatch) continue
    const id = idMatch[1]

    // 제목: <h2 class="job_tit"> 안의 title 속성
    const titleMatch = chunk.match(/<h2 class="job_tit">[\s\S]{0,300}?title="([^"]+)"/)
    if (!titleMatch) continue
    const title = titleMatch[1].trim()

    // URL
    const hrefMatch = chunk.match(/href="(\/zf_user\/jobs\/relay\/view\?[^"]+)"/)
    const url = hrefMatch
      ? `https://www.saramin.co.kr${hrefMatch[1].replace(/&amp;/g, '&')}`
      : `https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=${id}`

    // 회사명: corp_name 안의 <a> 텍스트
    const corpMatch = chunk.match(/class="corp_name"[\s\S]{0,400}?<a[^>]*>\s*([\s\S]*?)\s*<\/a>/)
    const companyName = corpMatch ? corpMatch[1].replace(/<[^>]+>/g, '').trim() : '–'

    // 조건 (지역·경력·학력·고용형태)
    const condBlock = chunk.match(/<div class="job_condition">([\s\S]*?)<\/div>/)
    const conditions: string[] = []
    if (condBlock) {
      const spanRe = /<span[^>]*>([\s\S]*?)<\/span>/g
      let sm: RegExpExecArray | null
      while ((sm = spanRe.exec(condBlock[1])) !== null) {
        const text = sm[1].replace(/<[^>]+>/g, '').trim()
        if (text) conditions.push(text)
      }
    }

    // 마감일: "~ 04/12(일)" → "2026-04-12", "채용시" → null
    const dateMatch = chunk.match(/<span class="date">([^<]+)<\/span>/)
    let deadline: string | null = null
    if (dateMatch) {
      const dmatch = dateMatch[1].match(/(\d{1,2})\/(\d{1,2})/)
      if (dmatch) {
        const now = new Date()
        const m = parseInt(dmatch[1])
        const d = parseInt(dmatch[2])
        const year = m < now.getMonth() + 1 ? now.getFullYear() + 1 : now.getFullYear()
        deadline = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      }
    }

    results.push({ id, title, url, companyName, conditions, deadline })
  }

  return results
}

// 사람인 파싱 아이템 → Job 타입 변환
function toSaraminJob(item: ReturnType<typeof parseSaraminHTML>[number]): Job {
  // 경력 파싱: "경력3년↑", "경력 3~5년", "신입·경력" 등
  const expCond = item.conditions.find((c) => /경력|신입/.test(c))
  let minYears = 3
  if (expCond) {
    const m = expCond.match(/(\d+)\s*년/)
    if (m) minYears = parseInt(m[1])
    else if (/신입/.test(expCond) && !/경력/.test(expCond)) minYears = 0
  }

  const empRaw = item.conditions.find((c) => /정규직|계약직|프리랜서/.test(c))
  const employment_type: EmploymentType =
    empRaw === '계약직' ? '계약직' : empRaw === '프리랜서' ? '프리랜서' : '정규직'

  const numId = parseInt(item.id) % 100000

  return {
    job_id: `saramin_${item.id}`,
    source_platform: 'saramin',
    company: {
      name: cleanCompanyName(item.companyName),
      logo_url: '',
      company_size: getCompanySize(item.companyName),
    },
    position: { title: item.title, url: item.url },
    employment_type,
    experience_req: { min_years: minYears, max_years: null },
    tags: extractTags(item.title, ''),
    deadline: item.deadline,
    match_score: getMatchScore(numId, 0),
  }
}

// 사람인 검색 HTML fetch
async function fetchSaraminPage(query: string, page: number): Promise<string> {
  const params = new URLSearchParams({
    searchType: 'search',
    searchword: query,
    recruitPage: String(page),
    recruitPageCount: '40',
    recruitSort: 'reg_dt',
  })
  const url = `https://www.saramin.co.kr/zf_user/search/recruit?${params}`
  const res = await fetch(url, { headers: SARAMIN_HEADERS, next: { revalidate: 1800 } })
  if (!res.ok) throw new Error(`Saramin ${res.status}`)
  return res.text()
}

// ─── Jobkorea ────────────────────────────────────────────────────────────────

interface JobkoreaCard {
  id: string
  title: string
  company: string
  logoUrl: string
  deadline: string | null
  isNewbie: boolean
}

// HTML 태그·엔티티 제거 유틸
function stripHtmlTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// 잡코리아 HTML에서 data-sentry-component="CardJob" 단위로 공고 추출
function parseJobkoreaHTML(html: string): JobkoreaCard[] {
  const results: JobkoreaCard[] = []
  const parts = html.split('data-sentry-component="CardJob"')

  for (let i = 1; i < parts.length; i++) {
    const section = parts[i]

    // ID: 첫 GI_Read href에서 추출
    const idMatch = section.match(/GI_Read\/(\d+)/)
    if (!idMatch) continue
    const id = idMatch[1]

    // GI_Read 링크 텍스트 추출 (빈 텍스트 제외) → 첫 번째=제목, 두 번째=회사명
    const linkRe = /href="[^"]*GI_Read\/\d+[^"]*"[^>]*>([\s\S]*?)<\/a>/g
    const texts: string[] = []
    let m: RegExpExecArray | null
    while ((m = linkRe.exec(section)) !== null) {
      const txt = stripHtmlTags(m[1]).trim()
      if (txt) texts.push(txt)
    }
    const title = texts[0] ?? ''
    const company = texts[1] ?? ''
    if (!title) continue

    // plaintext (태그 제거)
    const plainText = stripHtmlTags(section)

    // 마감일: MM/DD(요일) 마감 → 2026-MM-DD
    const dm = plainText.match(/(\d{2})\/(\d{2})\([가-힣]\)\s*마감/)
    const deadline = dm ? `2026-${dm[1]}-${dm[2]}` : null

    // 신입 여부: plaintext에 "신입" 포함
    const isNewbie = /신입/.test(plainText)

    // 로고 URL
    const logoM = section.match(/src="(https?:\/\/imgs\.jobkorea\.co\.kr[^"?]+)/)
    const logoUrl = logoM?.[1] ?? ''

    results.push({ id, title, company, logoUrl, deadline, isNewbie })
  }

  return results
}

// 잡코리아 공고 관련성 필터
function isJobkoreaDesignJob(card: JobkoreaCard): boolean {
  // 1. 디자인 직군 키워드 필수 (SARAMIN_MUST_HAVE 재사용)
  if (!SARAMIN_MUST_HAVE.some((p) => p.test(card.title))) return false
  // 2. 공통 블록 패턴 (비관련 직군, 주니어 등)
  if (REMEMBER_BLOCK_PATTERNS.some((p) => p.test(card.title))) return false
  // 3. 신입 공고 제외
  if (card.isNewbie) return false
  // 4. 브랜드 포지션 (allow 패턴 통과 제외)
  if (/브랜드/i.test(card.title) && !REMEMBER_ALLOW_PATTERNS.some((p) => p.test(card.title))) return false
  return true
}

// 잡코리아 카드 → Job 타입 변환
function toJobkoreaJob(card: JobkoreaCard): Job {
  const companyName = cleanCompanyName(card.company || '–')
  const numId = parseInt(card.id) % 100000

  return {
    job_id: `jk_${card.id}`,
    source_platform: 'jobkorea',
    company: {
      name: companyName,
      logo_url: card.logoUrl,
      company_size: getCompanySize(companyName),
    },
    position: {
      title: card.title,
      url: `https://www.jobkorea.co.kr/Recruit/GI_Read/${card.id}`,
    },
    employment_type: '정규직' as EmploymentType,
    experience_req: { min_years: 5, max_years: null },
    tags: extractTags(card.title, ''),
    deadline: card.deadline,
    match_score: getMatchScore(numId, 0),
  }
}

// 잡코리아 검색 HTML fetch
async function fetchJobkoreaPage(query: string, page: number): Promise<string> {
  const url = `https://www.jobkorea.co.kr/Search/?stext=${encodeURIComponent(query)}&tabType=recruit&Page_No=${page}`
  const res = await fetch(url, { headers: JOBKOREA_HEADERS, next: { revalidate: 1800 } })
  if (!res.ok) throw new Error(`Jobkorea ${res.status}`)
  return res.text()
}

// ─── Route Handler ───────────────────────────────────────────────────────────

export async function GET() {
  try {
    // 원티드 + 리멤버 + 사람인 + 잡코리아 병렬 fetch
    const [wPage1, wPage2, remPage1, remPage2, sarHtml1, sarHtml2, jkHtml1, jkHtml2] =
      await Promise.all([
        fetchWantedPage('프로덕트 디자이너', 0, 20),
        fetchWantedPage('프로덕트 디자이너', 20, 20),
        fetchRememberPage(1, 20).catch(() => [] as any[]),
        fetchRememberPage(2, 20).catch(() => [] as any[]),
        fetchSaraminPage('프로덕트 디자이너', 1).catch(() => ''),
        fetchSaraminPage('UX 디자이너', 1).catch(() => ''),
        fetchJobkoreaPage('프로덕트 디자이너', 1).catch(() => ''),
        fetchJobkoreaPage('UX 디자이너', 1).catch(() => ''),
      ])

    // ── Wanted 중복 제거 → 블록 패턴 필터 → 변환
    const seenWanted = new Set<number>()
    const wantedJobs: Job[] = [...wPage1, ...wPage2]
      .filter((item) => {
        if (seenWanted.has(item.id)) return false
        seenWanted.add(item.id)
        return true
      })
      .filter((item) => !REMEMBER_BLOCK_PATTERNS.some((p) => p.test(item.position ?? '')))
      .map(toWantedJob)

    if (wantedJobs.length === 0) throw new Error('Empty response from Wanted')

    // ── Remember 중복 제거 → 비관련 포지션 필터 → 변환
    const seenRemember = new Set<number>()
    const rememberJobs: Job[] = [...remPage1, ...remPage2]
      .filter((item) => {
        if (seenRemember.has(item.id)) return false
        seenRemember.add(item.id)
        return true
      })
      .filter((item) => isRelevantDesignJob(item.title ?? ''))
      .map(toRememberJob)

    // ── 사람인 파싱 → 중복 제거 → 필터 → 변환
    const seenSaramin = new Set<string>()
    const saraminJobs: Job[] = [...parseSaraminHTML(sarHtml1), ...parseSaraminHTML(sarHtml2)]
      .filter((item) => {
        if (seenSaramin.has(item.id)) return false
        seenSaramin.add(item.id)
        return true
      })
      .filter((item) => isSaraminDesignJob(item.title))
      .map(toSaraminJob)

    // ── 잡코리아 파싱 → 중복 제거 → 필터 → 변환
    const seenJk = new Set<string>()
    const jkJobs: Job[] = [...parseJobkoreaHTML(jkHtml1), ...parseJobkoreaHTML(jkHtml2)]
      .filter((card) => {
        if (seenJk.has(card.id)) return false
        seenJk.add(card.id)
        return true
      })
      .filter(isJobkoreaDesignJob)
      .map(toJobkoreaJob)

    // ── 전체 합산 + 헤드헌팅 회사 제외
    const jobs: Job[] = [...wantedJobs, ...rememberJobs, ...saraminJobs, ...jkJobs]
      .filter((job) => !COMPANY_BLOCK_PATTERNS.some((p) => p.test(job.company.name)))

    return NextResponse.json({
      jobs,
      total: jobs.length,
      sources: {
        wanted: wantedJobs.length,
        remember: rememberJobs.length,
        saramin: saraminJobs.length,
        jobkorea: jkJobs.length,
      },
      fetched_at: new Date().toISOString(),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[jobs-api]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
