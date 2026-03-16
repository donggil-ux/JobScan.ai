'use client'

import { useState, useRef, useEffect } from 'react'
import { Job } from '@/types/job'
import JobCard from './JobCard'

interface JobFeedProps {
  jobs: Job[]
  loading?: boolean
}

interface ToastState {
  jobId: string
  message: string
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
  const [toast, setToast] = useState<ToastState | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('hiddenJobs')
      if (raw) setHidden(new Set<string>(JSON.parse(raw) as string[]))
    } catch {}
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  const handleScrap = (id: string) => setScrapped((prev) => new Set(prev).add(id))

  const handleHide = (id: string) => {
    const job = jobs.find((j) => j.job_id === id)
    setHidden((prev) => {
      const next = new Set(prev).add(id)
      try {
        localStorage.setItem('hiddenJobs', JSON.stringify(Array.from(next)))
      } catch {}
      return next
    })

    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ jobId: id, message: job?.company.name ?? '해당 공고' })
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }

  const handleUndo = () => {
    if (!toast) return
    setHidden((prev) => {
      const next = new Set(prev)
      next.delete(toast.jobId)
      try {
        localStorage.setItem('hiddenJobs', JSON.stringify(Array.from(next)))
      } catch {}
      return next
    })
    setToast(null)
    if (toastTimer.current) clearTimeout(toastTimer.current)
  }

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

  return (
    <>
      <div className="pt-3 pb-24">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-5 text-center">
            <span className="text-4xl mb-3">🔍</span>
            <p className="text-gray-500 font-medium">조건에 맞는 공고가 없어요</p>
            <p className="text-gray-400 text-sm mt-1">필터를 변경하거나 숨긴 공고를 복원해 보세요</p>
          </div>
        ) : (
          visible.map((job) => (
            <JobCard
              key={job.job_id}
              job={job}
              onScrap={handleScrap}
              onHide={handleHide}
            />
          ))
        )}
        {scrapped.size > 0 && (
          <div className="mx-5 mt-2 p-3 bg-blue-50 rounded-xl text-center">
            <p className="text-sm text-primary font-medium">
              📌 {scrapped.size}개 스크랩됨
            </p>
          </div>
        )}
      </div>

      {/* Toast — 숨기기 알림 */}
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
          toast ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        <div className="bg-gray-900 text-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl"
             style={{ minWidth: '260px', maxWidth: '340px' }}>
          <span className="text-sm flex-1">공고를 숨겼습니다</span>
          <button
            onClick={handleUndo}
            className="text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors flex-shrink-0"
          >
            실행 취소
          </button>
        </div>
      </div>
    </>
  )
}
