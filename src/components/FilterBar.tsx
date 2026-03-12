'use client'

import FilterChip from './FilterChip'
import { Filters } from '@/types/job'

interface FilterBarProps {
  filters: Filters
  onChange: (key: keyof Filters, value: string) => void
  total: number | null // null = 로딩 중
  loading: boolean
  dataSource: 'wanted' | 'dummy'
}

const EXPERIENCE_OPTIONS = [
  { label: '경력 전체', value: 'all' },
  { label: '5~7년차', value: '5-7' },
  { label: '8년차 이상', value: '8plus' },
]

const EMPLOYMENT_OPTIONS = [
  { label: '고용형태 전체', value: 'all' },
  { label: '정규직', value: '정규직' },
  { label: '계약직', value: '계약직' },
  { label: '프리랜서', value: '프리랜서' },
]

const COMPANY_SIZE_OPTIONS = [
  { label: '기업규모 전체', value: 'all' },
  { label: '대기업', value: '대기업' },
  { label: '중견기업', value: '중견기업' },
  { label: '중소/스타트업', value: '중소/스타트업' },
]

const PLATFORM_OPTIONS = [
  { label: '플랫폼 전체', value: 'all' },
  { label: '원티드', value: 'wanted' },
  { label: '리멤버', value: 'remember' },
  { label: '서핏', value: 'surfit' },
  { label: '잡코리아', value: 'jobkorea' },
  { label: '사람인', value: 'saramin' },
]

export default function FilterBar({ filters, onChange, total, loading, dataSource }: FilterBarProps) {
  return (
    <div className="sticky top-0 z-20 bg-gray-50/95 backdrop-blur-sm border-b border-gray-100">
      <div
        className="flex items-center gap-2 px-5 py-3 overflow-x-auto scrollbar-hide"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <FilterChip
          label="경력"
          value={filters.experience}
          options={EXPERIENCE_OPTIONS}
          onChange={(v) => onChange('experience', v)}
        />
        <FilterChip
          label="고용형태"
          value={filters.employment}
          options={EMPLOYMENT_OPTIONS}
          onChange={(v) => onChange('employment', v)}
        />
        <FilterChip
          label="기업규모"
          value={filters.companySize}
          options={COMPANY_SIZE_OPTIONS}
          onChange={(v) => onChange('companySize', v)}
        />
        <FilterChip
          label="플랫폼"
          value={filters.platform}
          options={PLATFORM_OPTIONS}
          onChange={(v) => onChange('platform', v)}
        />
      </div>
      <div className="px-5 pb-2 -mt-1 flex items-center gap-2">
        {loading ? (
          <span className="text-xs text-gray-400 font-medium animate-pulse">불러오는 중…</span>
        ) : (
          <>
            <span className="text-xs text-gray-400 font-medium">{total}개 포지션</span>
            {dataSource === 'wanted' ? (
              <span className="text-xs font-semibold text-primary bg-blue-50 px-2 py-0.5 rounded-full">
                🔴 원티드 실시간
              </span>
            ) : (
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                더미 데이터
              </span>
            )}
          </>
        )}
      </div>
    </div>
  )
}
