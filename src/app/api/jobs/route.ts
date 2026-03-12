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
  return name.replace(/^\(주\)|\(유\)|\(사\)|\(재\)/g, '').trim()
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

// ─── 리멤버 관련성 필터 ────────────────────────────────────────────────────────
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
  /인턴/i,                                    // 인턴
  /주니어|Jr\./i,                             // 주니어
  /사원[-·~]주임|주임급|사원급/i,              // 사원/주임 직급
  /1[~-]3년\s*이하/i,                         // 경력 1~3년 이하
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
]

function isRelevantRememberJob(title: string): boolean {
  // 1. 명확히 관련 키워드 → 항상 통과 (블록보다 우선)
  if (REMEMBER_ALLOW_PATTERNS.some((p) => p.test(title))) return true
  // 2. 명백히 비관련 키워드 → 제외
  if (REMEMBER_BLOCK_PATTERNS.some((p) => p.test(title))) return false
  // 3. "브랜드" 포함 포지션 전체 제외 (allowlist 통과한 경우는 이미 위에서 return)
  if (/브랜드/i.test(title)) return false
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

// ─── Route Handler ───────────────────────────────────────────────────────────

export async function GET() {
  try {
    // 원티드 + 리멤버 병렬 fetch
    const [wPage1, wPage2, remPage1, remPage2] = await Promise.all([
      fetchWantedPage('프로덕트 디자이너', 0, 20),
      fetchWantedPage('프로덕트 디자이너', 20, 20),
      fetchRememberPage(1, 20).catch(() => [] as any[]),
      fetchRememberPage(2, 20).catch(() => [] as any[]),
    ])

    // ── Wanted 중복 제거 후 변환
    const seenWanted = new Set<number>()
    const wantedJobs: Job[] = [...wPage1, ...wPage2]
      .filter((item) => {
        if (seenWanted.has(item.id)) return false
        seenWanted.add(item.id)
        return true
      })
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
      .filter((item) => isRelevantRememberJob(item.title ?? ''))
      .map(toRememberJob)

    // ── 전체 합산
    const jobs: Job[] = [...wantedJobs, ...rememberJobs]

    return NextResponse.json({
      jobs,
      total: jobs.length,
      sources: { wanted: wantedJobs.length, remember: rememberJobs.length },
      fetched_at: new Date().toISOString(),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[jobs-api]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
