import React from 'react'
import useThemeStore from '../store/themeStore.js'

export default function Header() {
  const { theme, themeId, cycleTheme } = useThemeStore()

  const themeEmoji = { cupertino: '☀️', fluent: '🌙', vercel: '⚫', deepLogic: '✦' }
  const themeLabel = { cupertino: 'Cupertino Light', fluent: 'Fluent Dark', vercel: 'Vercel Black', deepLogic: 'Deep Logic' }

  return (
    <header className={`
      flex items-center justify-between px-5 h-12 shrink-0 z-10
      ${theme.headerBg}
    `}>
      {/* Left: logo + title */}
      <div className="flex items-center gap-2.5">
        <div className={`
          w-7 h-7 rounded-lg flex items-center justify-center
          ${theme.accent} shadow-sm
        `}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-white">
            <path d="M3 4h10M3 8h6M3 12h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            <circle cx="12.5" cy="11.5" r="2.5" fill="currentColor" opacity="0.7"/>
          </svg>
        </div>
        <span className={`font-semibold text-sm tracking-tight ${theme.headerText}`}>
          Step by Step
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${theme.tag}`}>
          JS Visualizer
        </span>
      </div>

      {/* Right: theme switcher */}
      <button
        onClick={cycleTheme}
        title={`Current: ${themeLabel[themeId]} — click to cycle`}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium
          transition-all duration-200 active:scale-95
          ${theme.btnBase}
        `}
      >
        <span className="text-base leading-none">{themeEmoji[themeId]}</span>
        <span className={theme.subText}>{themeLabel[themeId]}</span>
      </button>
    </header>
  )
}
