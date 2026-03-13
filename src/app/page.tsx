'use client'

import { useState, useMemo, useEffect } from 'react'
import Header from '@/components/Header'
import FilterBar from '@/components/FilterBar'
import JobFeed from '@/components/JobFeed'
import { DUMMY_JOBS } from '@/data/jobs'
import { Job, Filters } from '@/types/job'

const INITIAL_FILTERS: Filters = {
  experience: 'all',
  employment: 'all',
  companySize: 'all',
  platform: 'all',
}

export default function HomePage() {
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS)
  const [searchQuery, setSearchQuery] = useState('')
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [dataSource, setDataSource] = useState<'wanted' | 'dummy'>('dummy')

  useEffect(() => {
    fetch('/api/jobs')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.jobs) && data.jobs.length > 0) {
          setJobs(data.jobs)
          setDataSource('wanted')
        } else {
          setJobs(DUMMY_JOBS)
          setDataSource('dummy')
        }
      })
      .catch(() => {
        setJobs(DUMMY_JOBS)
        setDataSource('dummy')
      })
      .finally(() => setLoading(false))
  }, [])

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const filteredJobs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return jobs.filter((job) => {
      // 검색어 필터 (포지션 제목 + 회사명)
      if (q) {
        const titleMatch = job.position.title.toLowerCase().includes(q)
        const companyMatch = job.company.name.toLowerCase().includes(q)
        if (!titleMatch && !companyMatch) return false
      }
      // 경력 필터
      if (filters.experience === '5-7') {
        if (!(job.experience_req.min_years >= 5 && job.experience_req.min_years <= 7)) return false
      } else if (filters.experience === '8plus') {
        if (job.experience_req.min_years < 8) return false
      }
      // 고용 형태 필터
      if (filters.employment !== 'all' && job.employment_type !== filters.employment) return false
      // 기업 규모 필터
      if (filters.companySize !== 'all' && job.company.company_size !== filters.companySize) return false
      // 플랫폼 필터
      if (filters.platform !== 'all' && job.source_platform !== filters.platform) return false

      return true
    })
  }, [filters, searchQuery, jobs])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto" style={{ maxWidth: '800px' }}>
        <Header />
        <FilterBar
          filters={filters}
          onChange={handleFilterChange}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          total={loading ? null : filteredJobs.length}
          loading={loading}
          dataSource={dataSource}
        />
        <JobFeed jobs={filteredJobs} loading={loading} />
      </div>
    </div>
  )
}
