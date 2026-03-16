'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Job } from '@/types/job'

interface JobCardProps {
  job: Job
  onScrap: (id: string) => void
  onHide: (id: string) => void
}

const PLATFORM_LABEL: Record<string, string> = {
  wanted: '원티드',
  remember: '리멤버',
  surfit: '서핏',
  jobkorea: '잡코리아',
  saramin: '사람인',
  wishket: '위시켓',
}

const PLATFORM_COLOR: Record<string, string> = {
  wanted: 'bg-blue-50 text-blue-600',
  remember: 'bg-purple-50 text-purple-600',
  surfit: 'bg-teal-50 text-teal-600',
  jobkorea: 'bg-orange-50 text-orange-600',
  saramin: 'bg-green-50 text-green-600',
  wishket: 'bg-yellow-50 text-yellow-600',
}

function getMatchColor(score: number): string {
  if (score >= 85) return 'text-primary font-bold'
  if (score >= 75) return 'text-orange-500 font-semibold'
  return 'text-gray-500 font-medium'
}

function getDeadlineBadge(deadline: string | null): { label: string; className: string } {
  if (!deadline) return { label: '상시채용', className: 'bg-gray-100 text-gray-500' }
  const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
  if (diff < 0) return { label: '마감', className: 'bg-red-50 text-red-400' }
  if (diff <= 3) return { label: `D-${diff}`, className: 'bg-red-50 text-red-500 font-bold' }
  if (diff <= 7) return { label: `D-${diff}`, className: 'bg-orange-50 text-orange-500 font-semibold' }
  return { label: `D-${diff}`, className: 'bg-gray-100 text-gray-500' }
}

const SWIPE_THRESHOLD = 80

export default function JobCard({ job, onScrap, onHide }: JobCardProps) {
  const router = useRouter()
  const [offsetX, setOffsetX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [dismissed, setDismissed] = useState<'scrap' | 'hide' | null>(null)
  const startX = useRef(0)
  const cardRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    setDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return
    const delta = e.touches[0].clientX - startX.current
    setOffsetX(delta)
  }

  const handleTouchEnd = () => {
    setDragging(false)
    if (offsetX > SWIPE_THRESHOLD) {
      setDismissed('scrap')
      setTimeout(() => onScrap(job.job_id), 300)
    } else if (offsetX < -SWIPE_THRESHOLD) {
      setDismissed('hide')
      setTimeout(() => onHide(job.job_id), 300)
    } else {
      setOffsetX(0)
    }
  }

  const handleCardClick = () => {
    if (Math.abs(offsetX) < 10) {
      // 스크롤 위치 저장
      sessionStorage.setItem('feedScrollY', String(window.scrollY))
      // AI 분석 데이터 저장
      if (job.ai_analysis) {
        sessionStorage.setItem(`ai_${job.job_id}`, JSON.stringify(job.ai_analysis))
      }
      router.push(
        `/company/${encodeURIComponent(job.company.name)}` +
        `?position=${encodeURIComponent(job.position.title)}` +
        `&url=${encodeURIComponent(job.position.url)}` +
        `&logo=${encodeURIComponent(job.company.logo_url)}` +
        `&size=${encodeURIComponent(job.company.company_size)}` +
        `&score=${job.match_score}` +
        `&platform=${job.source_platform}` +
        `&jobUrl=${encodeURIComponent(job.position.url)}` +
        `&jobId=${job.job_id}`
      )
    }
  }

  const deadline = getDeadlineBadge(job.deadline)
  const matchColor = getMatchColor(job.match_score)
  const matchEmoji = job.match_score >= 85 ? '🔥' : job.match_score >= 75 ? '✨' : '💡'

  const cardStyle: React.CSSProperties = {
    transform: dismissed
      ? `translateX(${dismissed === 'scrap' ? '110%' : '-110%'})`
      : `translateX(${offsetX}px)`,
    opacity: dismissed ? 0 : Math.max(0.6, 1 - Math.abs(offsetX) / 200),
    transition: dragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease',
  }

  return (
    <div className="relative overflow-hidden rounded-xl mx-5 mb-3">
      {/* 스와이프 힌트 배경 */}
      <div
        className={`absolute inset-0 rounded-xl flex items-center px-6 transition-opacity duration-150 ${
          offsetX > 30 ? 'opacity-100' : 'opacity-0'
        } bg-blue-500`}
      >
        <span className="text-white font-semibold text-sm">📌 스크랩</span>
      </div>
      <div
        className={`absolute inset-0 rounded-xl flex items-center justify-end px-6 transition-opacity duration-150 ${
          offsetX < -30 ? 'opacity-100' : 'opacity-0'
        } bg-gray-300`}
      >
        <span className="text-gray-600 font-semibold text-sm">숨기기 ✕</span>
      </div>

      {/* 카드 본체 */}
      <div
        ref={cardRef}
        style={cardStyle}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleCardClick}
        className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 cursor-pointer active:bg-gray-50 select-none"
      >
        {/* Top: 플랫폼 뱃지 + AI 매칭 스코어 + 숨기기 버튼 */}
        <div className="flex items-center justify-between mb-3">
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
              PLATFORM_COLOR[job.source_platform] ?? 'bg-gray-100 text-gray-600'
            }`}
          >
            {PLATFORM_LABEL[job.source_platform]}
          </span>
          <div className="flex items-center gap-2">
            <span className={`text-sm ${matchColor}`}>
              {matchEmoji} Fit {job.match_score}%
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onHide(job.job_id) }}
              className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors flex-shrink-0"
              aria-label="관심 없음"
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Middle: 회사 정보 */}
        <div className="flex items-center gap-1.5 mb-2 min-w-0">
          <span className="text-sm font-medium text-gray-600 truncate">{job.company.name}</span>
          <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md flex-shrink-0">
            {job.company.company_size}
          </span>
          {job.position.role_type && (
            <span className={`text-xs px-1.5 py-0.5 rounded-md flex-shrink-0 font-medium ${
              job.position.role_type === 'Lead'
                ? 'bg-purple-50 text-purple-600'
                : 'bg-teal-50 text-teal-600'
            }`}>
              {job.position.role_type}
            </span>
          )}
        </div>

        {/* 포지션 타이틀 */}
        <h2 className="text-base font-bold text-gray-900 leading-snug mb-3">
          {job.position.title}
        </h2>

        {/* Bottom: 메타 정보 */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md font-medium flex-shrink-0">
              {job.employment_type}
            </span>
            {job.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md font-medium flex-shrink-0"
              >
                {tag}
              </span>
            ))}
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-md flex-shrink-0 ${deadline.className}`}>
            {deadline.label}
          </span>
        </div>
      </div>
    </div>
  )
}
