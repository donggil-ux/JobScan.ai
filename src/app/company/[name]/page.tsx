'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// ─── 타입 ─────────────────────────────────────────────────────────────────────
interface StartupInsights {
  vision: string
  history: string
  employee_count: number
  revenue: string
  total_investment: string
  company_age: string
  company_type: string
}

interface StartupInfoData {
  success: boolean
  data: {
    company_name: string
    insights: StartupInsights
  }
}

// ─── 매칭 스코어 (JobCard와 동일한 로직) ────────────────────────────────────
function getMatchColor(score: number): string {
  if (score >= 85) return 'text-primary font-bold'
  if (score >= 75) return 'text-orange-500 font-semibold'
  return 'text-gray-500 font-medium'
}

function getMatchEmoji(score: number): string {
  if (score >= 85) return '🔥'
  if (score >= 75) return '✨'
  return '💡'
}

// ─── 기업 규모 아이콘 ─────────────────────────────────────────────────────────
const COMPANY_SIZE_ICON: Record<string, string> = {
  대기업: '🏢',
  중견기업: '🏬',
  '중소/스타트업': '🚀',
}

// ─── 스켈레톤 ─────────────────────────────────────────────────────────────────
function SkeletonBlock({ w, h = 'h-4' }: { w: string; h?: string }) {
  return <div className={`${h} ${w} bg-gray-200 rounded animate-pulse`} />
}

// ─── 재무 스탯 카드 ───────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  loading,
  icon,
}: {
  label: string
  value: string | number
  loading: boolean
  icon: string
}) {
  const isEmpty = !loading && (value === '' || value === 0)
  return (
    <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
      <p className="text-lg mb-1">{icon}</p>
      <p className="text-xs text-gray-400 font-medium mb-1.5">{label}</p>
      {loading ? (
        <div className="flex justify-center">
          <SkeletonBlock w="w-14" h="h-5" />
        </div>
      ) : isEmpty ? (
        <p className="text-sm text-gray-300 font-medium">—</p>
      ) : (
        <p className="text-sm font-bold text-gray-800">
          {typeof value === 'number' ? `${value.toLocaleString()}명` : value}
        </p>
      )}
    </div>
  )
}

// ─── 메인 내부 컴포넌트 (useSearchParams 사용) ────────────────────────────────
function CompanyDetailInner({ name }: { name: string }) {
  const router = useRouter()
  const params = useSearchParams()

  const position = params.get('position') ?? ''
  const originalUrl = params.get('url') ?? ''
  const logo = params.get('logo') ?? ''
  const size = params.get('size') ?? ''
  const score = Number(params.get('score') ?? 0)
  const platform = params.get('platform') ?? ''
  const jobUrl = params.get('jobUrl') ?? ''

  const [info, setInfo] = useState<StartupInfoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [logoFailed, setLogoFailed] = useState(false)

  useEffect(() => {
    if (!name) return
    const apiUrl =
      `/api/startup-info?companyName=${encodeURIComponent(name)}` +
      (platform ? `&platform=${encodeURIComponent(platform)}` : '') +
      (jobUrl ? `&jobUrl=${encodeURIComponent(jobUrl)}` : '')
    fetch(apiUrl)
      .then((r) => r.json())
      .then((data: StartupInfoData) => {
        setInfo(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [name, platform, jobUrl])

  const insights = info?.data?.insights
  const hasData = info?.success && insights

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <div className="mx-auto" style={{ maxWidth: '800px' }}>

        {/* ── GNB ── */}
        <div className="px-5 pt-5 pb-2">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            뒤로
          </button>
        </div>

        {/* ── 헤더 카드 ── */}
        <div className="bg-white mx-5 rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
          <div className="flex items-center gap-3 mb-3">
            {/* 로고 */}
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {logo && !logoFailed ? (
                <img
                  src={logo}
                  alt={name}
                  className="w-full h-full object-contain"
                  onError={() => setLogoFailed(true)}
                />
              ) : (
                <span className="text-gray-400 text-lg font-bold">{name.slice(0, 1)}</span>
              )}
            </div>

            {/* 회사 메타 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                <span className="text-base font-bold text-gray-900">{name}</span>
                {size && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">
                    {COMPANY_SIZE_ICON[size]} {size}
                  </span>
                )}
              </div>
              {score > 0 && (
                <span className={`text-sm ${getMatchColor(score)}`}>
                  {getMatchEmoji(score)} AI Fit {score}%
                </span>
              )}
            </div>
          </div>

          {/* 포지션 제목 */}
          {position && (
            <h1 className="text-base font-bold text-gray-900 leading-snug">
              {position}
            </h1>
          )}
        </div>

        {/* ── 섹션 1: 비전 & 연혁 ── */}
        <div className="bg-white mx-5 rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
          <h2 className="text-sm font-bold text-gray-900 mb-3">비전 / 소개</h2>

          {loading ? (
            <div className="space-y-2 mb-4">
              <SkeletonBlock w="w-full" />
              <SkeletonBlock w="w-4/5" />
              <SkeletonBlock w="w-3/5" />
            </div>
          ) : hasData && insights?.vision ? (
            <p className="text-sm text-gray-600 leading-relaxed mb-4">{insights.vision}</p>
          ) : (
            <p className="text-sm text-gray-300 mb-4">정보를 가져오지 못했어요.</p>
          )}

          {(loading || (hasData && insights?.company_type)) && (
            <div className="border-t border-gray-50 pt-3 flex items-center gap-2">
              {loading ? <SkeletonBlock w="w-24" /> : (
                <>
                  <span className="text-xs text-gray-400">기업형태</span>
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                    {insights?.company_type}
                  </span>
                  {insights?.company_age && (
                    <span className="text-xs text-gray-400">· 업력 {insights.company_age}</span>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ── 섹션 2: 기업 현황 그리드 ── */}
        <div className="mx-5 mb-4">
          <h2 className="text-sm font-bold text-gray-900 mb-3 px-1">기업 현황</h2>
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              label="업력"
              value={insights?.company_age ?? ''}
              loading={loading}
              icon="🏛️"
            />
            <StatCard
              label="기업형태"
              value={insights?.company_type ?? ''}
              loading={loading}
              icon="🏷️"
            />
            <StatCard
              label="임직원"
              value={insights?.employee_count ?? 0}
              loading={loading}
              icon="👥"
            />
            <StatCard
              label="매출"
              value={insights?.revenue ?? ''}
              loading={loading}
              icon="📈"
            />
            <StatCard
              label="설립일"
              value={insights?.history ?? ''}
              loading={loading}
              icon="📅"
            />
            <StatCard
              label="총 투자"
              value={insights?.total_investment ?? ''}
              loading={loading}
              icon="💰"
            />
          </div>

          {/* 데이터 출처 안내 */}
          {!loading && (
            <p className="text-xs text-gray-400 text-center mt-3">
              출처: 사람인 기업정보 (정보가 다를 수 있습니다)
            </p>
          )}
        </div>

      </div>

      {/* ── Fixed CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4">
        <div className="mx-auto" style={{ maxWidth: '800px' }}>
          <button
            onClick={() => {
              if (originalUrl) window.open(originalUrl, '_blank', 'noopener,noreferrer')
            }}
            disabled={!originalUrl}
            className={`w-full font-semibold py-3.5 rounded-xl text-base transition-opacity ${
              originalUrl
                ? 'bg-blue-600 text-white active:opacity-80'
                : 'bg-gray-200 text-gray-400 opacity-50 cursor-not-allowed'
            }`}
          >
            원문 보고 지원하기
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page Export (Suspense 래핑 — useSearchParams 빌드 에러 방지) ─────────────
export default function CompanyDetailPage({ params }: { params: { name: string } }) {
  const name = decodeURIComponent(params.name)
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <CompanyDetailInner name={name} />
    </Suspense>
  )
}
