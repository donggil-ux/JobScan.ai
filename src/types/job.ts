export type Platform = 'wanted' | 'remember' | 'surfit' | 'jobkorea' | 'saramin'
export type CompanySize = '대기업' | '중견기업' | '중소/스타트업'
export type EmploymentType = '정규직' | '계약직' | '프리랜서'

export interface Job {
  job_id: string
  source_platform: Platform
  company: {
    name: string
    logo_url: string
    company_size: CompanySize
  }
  position: {
    title: string
    url: string
  }
  employment_type: EmploymentType
  experience_req: {
    min_years: number
    max_years: number | null
  }
  tags: string[]
  deadline: string | null // YYYY-MM-DD | null = 상시채용
  match_score: number
}

export type FilterExperience = 'all' | '5-7' | '8plus'
export type FilterEmployment = 'all' | '정규직' | '계약직' | '프리랜서'
export type FilterCompanySize = 'all' | '대기업' | '중견기업' | '중소/스타트업'
export type FilterPlatform = 'all' | Platform
export type FilterSort = 'all' | 'deadline'

export interface Filters {
  experience: FilterExperience
  employment: FilterEmployment
  companySize: FilterCompanySize
  platform: FilterPlatform
  sort: FilterSort
}
