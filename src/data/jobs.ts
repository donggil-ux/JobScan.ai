import { Job } from '@/types/job'

export const DUMMY_JOBS: Job[] = [
  {
    job_id: 'j001',
    source_platform: 'wanted',
    company: {
      name: '카카오',
      logo_url: 'https://static.wanted.co.kr/images/wdes/0_1.jpg',
      company_size: '대기업',
    },
    position: {
      title: 'Lead Product Designer (B2B SaaS)',
      url: 'https://www.wanted.co.kr',
      role_type: 'Lead',
    },
    employment_type: '정규직',
    experience_req: { min_years: 7, max_years: null },
    tags: ['B2B', 'SaaS', '디자인시스템'],
    deadline: '2026-03-17',
    match_score: 92,
    ai_analysis: {
      portfolio_action_plan: {
        identified_gap: '데이터 기반 UX 개선 경험이 정성적 리서치 위주로 작성됨.',
        improvement_guide: '첫 번째 프로젝트 장표에 A/B 테스트 결과나 CVR 상승 수치를 추가하여 보완할 것.',
      },
    },
  },
  {
    job_id: 'j002',
    source_platform: 'wanted',
    company: {
      name: '토스',
      logo_url: 'https://static.wanted.co.kr/images/wdes/0_1.jpg',
      company_size: '중소/스타트업',
    },
    position: {
      title: 'Senior Product Designer - Core Experience',
      url: 'https://www.wanted.co.kr',
      role_type: 'IC',
    },
    employment_type: '정규직',
    experience_req: { min_years: 5, max_years: 9 },
    tags: ['핀테크', 'iOS', 'Android'],
    deadline: '2026-03-22',
    match_score: 88,
    ai_analysis: {
      portfolio_action_plan: {
        identified_gap: '모바일 플로우 케이스 스터디가 부재하고 결제 UX 사례가 없음.',
        improvement_guide: '결제·송금 플로우를 포함한 모바일 케이스를 최소 1개 추가하고, 사용자 인터뷰 인사이트를 정량 지표와 연결해 서술할 것.',
      },
    },
  },
  {
    job_id: 'j003',
    source_platform: 'remember',
    company: {
      name: '네이버',
      logo_url: 'https://static.wanted.co.kr/images/wdes/0_1.jpg',
      company_size: '대기업',
    },
    position: {
      title: '디자인 시스템 리드 디자이너',
      url: 'https://career.navercorp.com',
      role_type: 'Lead',
    },
    employment_type: '정규직',
    experience_req: { min_years: 8, max_years: null },
    tags: ['디자인시스템', 'Figma', '컴포넌트'],
    deadline: null,
    match_score: 85,
    ai_analysis: {
      portfolio_action_plan: {
        identified_gap: '컴포넌트 라이브러리 구축 경험은 있으나 토큰 시스템 설계 사례가 없음.',
        improvement_guide: 'Figma Variable 또는 Design Token 적용 사례를 포트폴리오에 추가하고, 여러 팀/제품에 걸친 디자인 일관성 유지 프로세스를 기술할 것.',
      },
    },
  },
  {
    job_id: 'j004',
    source_platform: 'surfit',
    company: {
      name: '쿠팡',
      logo_url: 'https://static.wanted.co.kr/images/wdes/0_1.jpg',
      company_size: '대기업',
    },
    position: {
      title: 'Principal Product Designer - Commerce',
      url: 'https://www.coupang.com',
      role_type: 'Lead',
    },
    employment_type: '정규직',
    experience_req: { min_years: 8, max_years: null },
    tags: ['이커머스', 'B2C', '데이터기반'],
    deadline: '2026-03-31',
    match_score: 79,
    ai_analysis: {
      portfolio_action_plan: {
        identified_gap: '대규모 트래픽 환경에서의 실험 기반 설계 사례가 부족함.',
        improvement_guide: '전환율(CVR) 또는 클릭률(CTR) 개선 실험을 중심으로 한 이커머스 케이스 스터디를 최소 1개 구체적으로 작성할 것.',
      },
    },
  },
  {
    job_id: 'j005',
    source_platform: 'wanted',
    company: {
      name: '당근',
      logo_url: 'https://static.wanted.co.kr/images/wdes/0_1.jpg',
      company_size: '중소/스타트업',
    },
    position: {
      title: 'Product Designer (리드급) - 로컬비즈니스',
      url: 'https://www.wanted.co.kr',
      role_type: 'Lead',
    },
    employment_type: '정규직',
    experience_req: { min_years: 6, max_years: 10 },
    tags: ['로컬', 'O2O', 'Growth'],
    deadline: '2026-04-05',
    match_score: 91,
    ai_analysis: {
      portfolio_action_plan: {
        identified_gap: 'O2O 서비스 경험이 없으며, 광고주(사업자) 관점의 UX 케이스가 부재함.',
        improvement_guide: '사업자·소비자 양방향 제품 경험 혹은 지역 기반 서비스의 그로스 실험 사례를 추가하여 당근 비즈니스 이해도를 어필할 것.',
      },
    },
  },
  {
    job_id: 'j006',
    source_platform: 'remember',
    company: {
      name: '삼성전자 MX',
      logo_url: 'https://static.wanted.co.kr/images/wdes/0_1.jpg',
      company_size: '대기업',
    },
    position: {
      title: 'UX Design Lead - Galaxy AI',
      url: 'https://www.samsung.com',
      role_type: 'Lead',
    },
    employment_type: '정규직',
    experience_req: { min_years: 9, max_years: null },
    tags: ['AI/ML', 'HW+SW', '글로벌'],
    deadline: null,
    match_score: 72,
    ai_analysis: {
      portfolio_action_plan: {
        identified_gap: 'AI 기능 설계 및 하드웨어-소프트웨어 통합 UX 경험이 포트폴리오에 없음.',
        improvement_guide: 'AI 어시스턴트, 음성 인터페이스 등 AI 기반 인터랙션 설계 경험을 추가하거나, 글로벌 다국어 UX 사례를 보완할 것.',
      },
    },
  },
  {
    job_id: 'j007',
    source_platform: 'surfit',
    company: {
      name: '무신사',
      logo_url: 'https://static.wanted.co.kr/images/wdes/0_1.jpg',
      company_size: '중견기업',
    },
    position: {
      title: 'Senior Product Designer - 패션 커머스',
      url: 'https://www.musinsa.com',
      role_type: 'IC',
    },
    employment_type: '정규직',
    experience_req: { min_years: 5, max_years: 8 },
    tags: ['패션', '이커머스', '개인화'],
    deadline: '2026-03-19',
    match_score: 83,
    ai_analysis: {
      portfolio_action_plan: {
        identified_gap: '개인화 추천 UX 경험 및 패션 도메인 이해도가 포트폴리오에서 확인이 어려움.',
        improvement_guide: '추천 피드 또는 개인화 탐색 UX 케이스를 추가하고, 패션·라이프스타일 도메인 사용자 리서치 경험을 명시할 것.',
      },
    },
  },
  {
    job_id: 'j008',
    source_platform: 'wanted',
    company: {
      name: '29CM',
      logo_url: 'https://static.wanted.co.kr/images/wdes/0_1.jpg',
      company_size: '중소/스타트업',
    },
    position: {
      title: 'Product Designer (경력 5년 이상)',
      url: 'https://www.wanted.co.kr',
      role_type: 'IC',
    },
    employment_type: '계약직',
    experience_req: { min_years: 5, max_years: 8 },
    tags: ['라이프스타일', 'D2C', 'CX'],
    deadline: '2026-03-28',
    match_score: 76,
    ai_analysis: {
      portfolio_action_plan: {
        identified_gap: '브랜드 아이덴티티와 UX를 통합한 경험 설계 사례가 없음.',
        improvement_guide: '큐레이션 기반 쇼핑 경험 또는 브랜드 일관성을 고려한 인터페이스 설계 케이스를 포트폴리오에 추가할 것.',
      },
    },
  },
  {
    job_id: 'j009',
    source_platform: 'jobkorea',
    company: {
      name: '크래프톤',
      logo_url: 'https://static.wanted.co.kr/images/wdes/0_1.jpg',
      company_size: '중견기업',
    },
    position: {
      title: 'Lead UX Designer - Game Platform',
      url: 'https://www.jobkorea.co.kr',
      role_type: 'Lead',
    },
    employment_type: '정규직',
    experience_req: { min_years: 7, max_years: null },
    tags: ['게임', 'B2C', 'PC/모바일'],
    deadline: null,
    match_score: 68,
    ai_analysis: {
      portfolio_action_plan: {
        identified_gap: '게임 플랫폼 또는 엔터테인먼트 도메인 UX 경험이 없음.',
        improvement_guide: '게임 내 구매 플로우, 리텐션 루프 설계, 또는 플랫폼 온보딩 개선 사례를 추가하여 게임 UX 이해도를 어필할 것.',
      },
    },
  },
  {
    job_id: 'j010',
    source_platform: 'saramin',
    company: {
      name: '라인플러스',
      logo_url: 'https://static.wanted.co.kr/images/wdes/0_1.jpg',
      company_size: '대기업',
    },
    position: {
      title: 'Principal Designer - LINE App',
      url: 'https://www.saramin.co.kr',
      role_type: 'Lead',
    },
    employment_type: '프리랜서',
    experience_req: { min_years: 8, max_years: null },
    tags: ['글로벌', '메신저', 'AI'],
    deadline: '2026-04-12',
    match_score: 65,
    ai_analysis: {
      portfolio_action_plan: {
        identified_gap: '글로벌 멀티마켓 UX 경험 및 다국어 인터페이스 설계 사례가 없음.',
        improvement_guide: '다국어/다문화 사용자 대상 리서치 및 현지화 UX 설계 경험을 포트폴리오에 포함하고, 메신저 플랫폼 관련 사례를 추가할 것.',
      },
    },
  },
]
