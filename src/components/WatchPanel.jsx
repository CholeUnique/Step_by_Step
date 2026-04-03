import React from 'react'
import useThemeStore from '../store/themeStore.js'
import useTimelineStore from '../store/timelineStore.js'

/**
 * Recursive JSON tree renderer.
 */
function JsonNode({ value, depth = 0, theme }) {
  const indentPx = depth * 14

  if (value === null || value === undefined) {
    return <span className={theme.jsonNull}>{value === null ? 'null' : 'undefined'}</span>
  }
  if (typeof value === 'boolean') {
    return <span className={theme.jsonBool}>{String(value)}</span>
  }
  if (typeof value === 'number') {
    return <span className={theme.jsonNum}>{value}</span>
  }
  if (typeof value === 'string') {
    return <span className={theme.jsonStr}>"{value}"</span>
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className={theme.text}>[]</span>
    return (
      <span>
        <span className={theme.text}>{'['}</span>
        <div style={{ marginLeft: indentPx + 14 }}>
          {value.map((item, i) => (
            <div key={i} className="flex items-start gap-1">
              <span className={`${theme.jsonNum} select-none opacity-60`}>{i}:</span>
              <JsonNode value={item} depth={depth + 1} theme={theme} />
            </div>
          ))}
        </div>
        <span className={theme.text}>{']'}</span>
      </span>
    )
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value)
    if (keys.length === 0) return <span className={theme.text}>{'{}'}</span>
    return (
      <span>
        <span className={theme.text}>{'{'}</span>
        <div style={{ marginLeft: indentPx + 14 }}>
          {keys.map(k => (
            <div key={k} className="flex items-start gap-1 py-0.5">
              <span className={`${theme.jsonKey} font-medium`}>{k}</span>
              <span className={`${theme.subText} mx-0.5`}>:</span>
              <JsonNode value={value[k]} depth={depth + 1} theme={theme} />
            </div>
          ))}
        </div>
        <span className={theme.text}>{'}'}</span>
      </span>
    )
  }
  return <span className={theme.text}>{String(value)}</span>
}

function Section({ title, theme, children }) {
  return (
    <div>
      <div className={`text-xs font-semibold uppercase tracking-wider ${theme.subText} mb-1.5 select-none`}>
        {title}
      </div>
      <div className={`rounded-xl p-2.5 ${theme.panelBg}`}>
        {children}
      </div>
    </div>
  )
}

function EmptyState({ theme }) {
  return (
    <div className={`flex-1 flex flex-col items-center justify-center gap-2 select-none`}>
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" className={theme.subText} opacity="0.3">
        <rect x="6" y="9" width="24" height="3.5" rx="1.75" fill="currentColor"/>
        <rect x="6" y="16.25" width="16" height="3.5" rx="1.75" fill="currentColor"/>
        <rect x="6" y="23.5" width="20" height="3.5" rx="1.75" fill="currentColor"/>
      </svg>
      <p className={`text-xs ${theme.subText}`}>Run or step to see variables</p>
    </div>
  )
}

export default function WatchPanel() {
  const { theme } = useThemeStore()
  const { timeline, currentStep } = useTimelineStore()
  const snap = timeline[currentStep] ?? null

  return (
    <div className={`
      flex flex-col h-full overflow-hidden
      ${theme.watchBg} rounded-2xl
    `}>
      {/* Panel header */}
      <div className={`
        flex items-center gap-2 px-4 py-2.5 shrink-0
        border-b border-current/10
      `}
        style={{ borderColor: 'rgba(128,128,128,0.15)' }}
      >
        <span className={`text-sm font-semibold ${theme.text} select-none`}>Watch</span>
        {snap && (
          <span className={`ml-auto text-xs tabular-nums ${theme.subText}`}>
            step&nbsp;{snap.step}
            {snap.line != null && ` · line ${snap.line}`}
          </span>
        )}
      </div>

      {!snap ? (
        <EmptyState theme={theme} />
      ) : (
        <div className="flex-1 overflow-y-auto text-xs font-mono leading-relaxed p-3 space-y-4">
          {/* Variables */}
          <Section title="Variables" theme={theme}>
            {Object.keys(snap.variables).length === 0 ? (
              <span className={theme.subText}>—</span>
            ) : (
              Object.entries(snap.variables).map(([k, v]) => (
                <div key={k} className="flex items-start gap-2 py-0.5">
                  <span
                    className={`${theme.jsonKey} font-semibold shrink-0`}
                    style={{ minWidth: 80 }}
                    title={k}
                  >
                    {k}
                  </span>
                  <span className={`${theme.subText} shrink-0`}>=</span>
                  <JsonNode value={v} theme={theme} />
                </div>
              ))
            )}
          </Section>

          {/* Call Stack */}
          <Section title="Call Stack" theme={theme}>
            {snap.callStack.length === 0 ? (
              <span className={theme.subText}>—</span>
            ) : (
              snap.callStack.map((frame, i) => (
                <div key={i} className="flex items-center gap-2 py-0.5">
                  <span className={`${i === 0 ? theme.accentText : theme.subText} w-3 shrink-0 text-center`}>
                    {i === 0 ? '▶' : '·'}
                  </span>
                  <span className={i === 0 ? `${theme.text} font-medium` : theme.subText}>
                    {frame}
                  </span>
                  {i === 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ml-auto ${theme.tag}`}>
                      active
                    </span>
                  )}
                </div>
              ))
            )}
          </Section>
        </div>
      )}
    </div>
  )
}
