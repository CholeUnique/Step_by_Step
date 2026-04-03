import React from 'react'
import useThemeStore from '../store/themeStore.js'
import useTimelineStore from '../store/timelineStore.js'
import VisualizerView from '../visualizer/VisualizerView.jsx'

/**
 * Visualizer: upper-right panel.
 * Delegates variable rendering to VisualizerView (via VisualizerAdapter).
 */
export default function Visualizer() {
  const { theme } = useThemeStore()
  const { timeline, currentStep, status } = useTimelineStore()
  const snap = timeline[currentStep] ?? null
  const prevSnap = currentStep > 0 ? (timeline[currentStep - 1] ?? null) : null
  const total = timeline.length

  return (
    <div className={`
      flex flex-col h-full gap-3 p-3
      ${theme.panelBg} rounded-2xl overflow-hidden
    `}>
      {/* Top row: step counter + progress bar */}
      <div className="flex items-center gap-3 shrink-0">
        <div className={`flex flex-col ${theme.text}`}>
          <span className="text-2xl font-bold tabular-nums leading-none">
            {snap ? snap.step : 0}
          </span>
          <span className={`text-xs ${theme.subText}`}>/ {total > 0 ? total - 1 : 0} steps</span>
        </div>

        {/* Progress bar */}
        <div className="flex-1 h-1.5 rounded-full bg-current opacity-10 relative overflow-hidden">
          <div
            className={`absolute inset-y-0 left-0 rounded-full ${theme.accent} opacity-100 transition-all duration-300`}
            style={{ width: total > 1 ? `${(currentStep / (total - 1)) * 100}%` : '0%' }}
          />
        </div>

        <StatusBadge status={status} theme={theme} />
      </div>

      {/* Main visual area */}
      {!snap ? (
        <PlaceholderGrid theme={theme} />
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
          {/* Line indicator */}
          {snap.line != null && (
            <LineCard line={snap.line} theme={theme} />
          )}

          {/* Semantic structure visualizer (via VisualizerAdapter → VisualizerView) */}
          <VisualizerView
            variables={snap.variables}
            prevVariables={prevSnap?.variables ?? null}
            theme={theme}
          />

          {/* Call stack frames */}
          <StackVisual callStack={snap.callStack} theme={theme} />
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status, theme }) {
  const colors = {
    idle:     'bg-gray-400/20 text-gray-400',
    running:  'bg-green-400/20 text-green-400',
    paused:   'bg-yellow-400/20 text-yellow-400',
    finished: 'bg-blue-400/20 text-blue-400',
  }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[status] ?? colors.idle}`}>
      {status}
    </span>
  )
}

function LineCard({ line, theme }) {
  return (
    <div className={`
      flex items-center gap-3 px-3 py-2 rounded-xl
      bg-yellow-400/10 border border-yellow-400/20
    `}>
      <span className="text-yellow-400 text-lg">▶</span>
      <div>
        <p className={`text-xs font-medium ${theme.text}`}>Executing</p>
        <p className="text-xs text-yellow-400 font-mono">Line {line}</p>
      </div>
    </div>
  )
}


function StackVisual({ callStack, theme }) {
  if (!callStack || callStack.length === 0) return null
  return (
    <div>
      <p className={`text-xs font-semibold uppercase tracking-wider ${theme.subText} mb-1.5 select-none`}>Stack Frames</p>
      <div className="flex flex-col-reverse gap-1">
        {callStack.map((frame, i) => (
          <div
            key={i}
            className={`
              rounded-xl px-3 py-2 flex items-center gap-2
              ${i === callStack.length - 1
                ? `${theme.panelBg} border-2 border-yellow-400/30`
                : theme.sidebarBg}
              transition-all duration-200
            `}
            style={{ marginLeft: i * 8 }}
          >
            <span className={`text-xs font-mono ${i === callStack.length - 1 ? theme.accentText : theme.subText}`}>
              {frame}
            </span>
            {i === callStack.length - 1 && (
              <span className="ml-auto text-yellow-400 text-xs">← top</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function PlaceholderGrid({ theme }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3">
      <div className="grid grid-cols-2 gap-2 w-full max-w-xs opacity-20">
        {[...Array(4)].map((_, i) => (
          <div key={i} className={`h-16 rounded-xl ${theme.sidebarBg} animate-pulse`}
            style={{ animationDelay: `${i * 150}ms` }} />
        ))}
      </div>
      <p className={`text-xs ${theme.subText} select-none`}>Memory graph appears here</p>
    </div>
  )
}

