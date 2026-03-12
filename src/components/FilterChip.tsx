'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface FilterChipProps {
  label: string
  value: string
  options: { label: string; value: string }[]
  onChange: (value: string) => void
}

export default function FilterChip({ label, value, options, onChange }: FilterChipProps) {
  const [open, setOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })
  const [mounted, setMounted] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const isActive = value !== 'all'
  const activeLabel = options.find((o) => o.value === value)?.label ?? label

  const updatePos = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + 4, left: rect.left })
    }
  }

  const handleToggle = () => {
    if (!open) updatePos()
    setOpen((prev) => !prev)
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    const handleScroll = () => setOpen(false)
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [])

  return (
    <div className="relative flex-shrink-0">
      {/* 트리거 버튼 */}
      <button
        ref={btnRef}
        onClick={handleToggle}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 whitespace-nowrap ${
          isActive
            ? 'bg-primary text-white border-primary shadow-sm'
            : open
            ? 'bg-white text-gray-800 border-gray-300 shadow-sm'
            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
        }`}
      >
        {activeLabel}
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-150 ${open ? 'rotate-180' : ''} ${
            isActive ? 'text-white/80' : 'text-gray-400'
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 드롭다운 메뉴 — Portal로 body에 직접 렌더링 (backdrop-filter 영향 차단) */}
      {open && mounted && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: dropdownPos.top,
            left: dropdownPos.left,
            zIndex: 9999,
          }}
          className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden min-w-[148px] py-1"
        >
          {options.map((option, idx) => {
            const isSelected = value === option.value
            return (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors ${
                  isSelected
                    ? 'text-primary font-semibold bg-blue-50/60'
                    : 'text-gray-700 hover:bg-gray-50'
                } ${idx === 0 && options.length > 1 ? 'border-b border-gray-100' : ''}`}
              >
                <span>{option.label}</span>
                {isSelected && (
                  <svg
                    className="w-3.5 h-3.5 text-primary flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>,
        document.body
      )}
    </div>
  )
}
