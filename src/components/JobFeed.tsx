'use client'

import { useState } from 'react'
import { Job } from '@/types/job'
import JobCard from './JobCard'

interface JobFeedProps {
  jobs: Job[]
  loading?: boolean
}

function SkeletonCard() {
  return (
    <div className="mx-5 my-2 bg-white rounded-2xl shadow-sm p-4 animate-pulse">
      <div className="flex justify-between mb-3">
        <div className="h-4 w-16 bg-gray-100 rounded-full" />
        <div className="h-4 w-16 bg-gray-100 rounded-full" />
      </div>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 bg-gray-100 rounded-lg" />
        <div className="h-4 w-24 bg-gray-100 rounded" />
      </div>
      <div className="h-5 w-3/4 bg-gray-100 rounded mb-3" />
      <div className="flex gap-2">
        <div className="h-6 w-14 bg-gray-100 rounded-full" />
        <div className="h-6 w-14 bg-gray-100 rounded-full" />
        <div className="h-6 w-14 bg-gray-100 rounded-full" />
      </div>
    </div>
  )
}

export default function JobFeed({ jobs, loading = false }: JobFeedProps) {
  const [scrapped, setScrapped] = useState<Set<string>>(new Set())
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  const handleScrap = (id: string) => setScrapped((prev) => new Set(prev).add(id))
  const handleHide = (id: string) => setHidden((prev) => new Set(prev).add(id))

  if (loading) {
    return (
      <div className="pt-3 pb-24">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  const visible = jobs.filter((j) => !hidden.has(j.job_id))

  if (visible.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-5 text-center">
        <span className="text-4xl mb-3">🔍</span>
        <p className="text-gray-500 font-medium">조건에 맞는 공고가 없어요</p>
        <p className="text-gray-400 text-sm mt-1">필터를 변경하거나 숨긴 공고를 복원해 보세요</p>
      </div>
    )
  }

  return (
    <div className="pt-3 pb-24">
      {visible.map((job) => (
        <JobCard
          key={job.job_id}
          job={job}
          onScrap={handleScrap}
          onHide={handleHide}
        />
      ))}
      {scrapped.size > 0 && (
        <div className="mx-5 mt-2 p-3 bg-blue-50 rounded-xl text-center">
          <p className="text-sm text-primary font-medium">
            📌 {scrapped.size}개 스크랩됨
          </p>
        </div>
      )}
    </div>
  )
}
