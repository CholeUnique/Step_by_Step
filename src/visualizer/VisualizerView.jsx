import React from 'react'
import { buildVisualizerState } from './VisualizerAdapter.js'

/**
 * VisualizerView
 *
 * Renders structured semantic data produced by VisualizerAdapter.
 * Receives a raw `variables` object and converts it through the Adapter
 * before rendering — never parses variables directly.
 *
 * Supported types: array, stack, queue, object, primitive, tree, linkedlist
 */
export default function VisualizerView({ variables, theme }) {
  const { structures } = buildVisualizerState({ variables })

  if (!structures || structures.length === 0) {
    return (
      <p className={`text-xs ${theme.subText} select-none`}>No variables</p>
    )
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {structures.map((item) => (
        <StructureBlock key={item.name} item={item} theme={theme} />
      ))}
    </div>
  )
}

function StructureBlock({ item, theme }) {
  switch (item.type) {
    case 'array':    return <ArrayBlock item={item} theme={theme} />
    case 'stack':    return <StackBlock item={item} theme={theme} />
    case 'queue':    return <QueueBlock item={item} theme={theme} />
    case 'object':   return <ObjectBlock item={item} theme={theme} />
    case 'tree':     return <ObjectBlock item={item} theme={theme} label="tree" />
    case 'linkedlist': return <ObjectBlock item={item} theme={theme} label="linked-list" />
    default:         return <PrimitiveBlock item={item} theme={theme} />
  }
}

/* ─── Section label ─────────────────────────────────────── */
function SectionLabel({ name, type, theme }) {
  const typeColors = {
    array:      'bg-blue-400/20 text-blue-400',
    stack:      'bg-purple-400/20 text-purple-400',
    queue:      'bg-emerald-400/20 text-emerald-400',
    object:     'bg-orange-400/20 text-orange-400',
    primitive:  'bg-gray-400/20 text-gray-400',
    tree:       'bg-pink-400/20 text-pink-400',
    linkedlist: 'bg-yellow-400/20 text-yellow-400',
  }
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <span className={`text-xs font-mono font-semibold ${theme.jsonKey}`}>{name}</span>
      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${typeColors[type] ?? typeColors.primitive}`}>
        {type}
      </span>
    </div>
  )
}

/* ─── Array: horizontal blocks ─────────────────────────── */
function ArrayBlock({ item, theme }) {
  const arr = Array.isArray(item.value) ? item.value : []
  return (
    <div>
      <SectionLabel name={item.name} type="array" theme={theme} />
      <div className="flex flex-wrap gap-1.5">
        {arr.length === 0 ? (
          <span className={`text-xs ${theme.subText}`}>[ empty ]</span>
        ) : (
          arr.map((v, i) => (
            <div
              key={i}
              className={`
                flex flex-col items-center rounded-xl px-3 py-1.5 min-w-[2.5rem]
                ${theme.sidebarBg}
                border border-blue-400/20
                transition-all duration-200
              `}
            >
              <span className={`text-[10px] ${theme.subText} leading-none mb-0.5`}>{i}</span>
              <span className={`text-sm font-mono font-bold ${theme.text}`}>{fmt(v)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/* ─── Stack: vertical, top at top ──────────────────────── */
function StackBlock({ item, theme }) {
  const arr = Array.isArray(item.value) ? item.value : []
  // Render reversed so index 0 is at bottom
  const reversed = [...arr].reverse()
  return (
    <div>
      <SectionLabel name={item.name} type="stack" theme={theme} />
      <div className="flex flex-col gap-1">
        {arr.length === 0 ? (
          <span className={`text-xs ${theme.subText}`}>[ empty ]</span>
        ) : (
          reversed.map((v, ri) => {
            const isTop = ri === 0
            return (
              <div
                key={ri}
                className={`
                  flex items-center justify-between px-3 py-1.5 rounded-xl
                  ${isTop
                    ? `${theme.panelBg} border-2 border-purple-400/40`
                    : `${theme.sidebarBg} border border-purple-400/10`
                  }
                  transition-all duration-200
                `}
              >
                <span className={`text-sm font-mono font-bold ${theme.text}`}>{fmt(v)}</span>
                {isTop && <span className="text-purple-400 text-[10px] font-medium">← top</span>}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

/* ─── Queue: horizontal with arrows ────────────────────── */
function QueueBlock({ item, theme }) {
  const arr = Array.isArray(item.value) ? item.value : []
  return (
    <div>
      <SectionLabel name={item.name} type="queue" theme={theme} />
      <div className="flex items-center flex-wrap gap-1">
        {arr.length === 0 ? (
          <span className={`text-xs ${theme.subText}`}>[ empty ]</span>
        ) : (
          arr.map((v, i) => (
            <React.Fragment key={i}>
              <div
                className={`
                  flex flex-col items-center rounded-xl px-3 py-1.5 min-w-[2.5rem]
                  ${theme.sidebarBg}
                  border border-emerald-400/20
                  transition-all duration-200
                `}
              >
                {i === 0 && (
                  <span className="text-[10px] text-emerald-400 leading-none mb-0.5">front</span>
                )}
                {i === arr.length - 1 && i !== 0 && (
                  <span className="text-[10px] text-emerald-400 leading-none mb-0.5">rear</span>
                )}
                {i !== 0 && i !== arr.length - 1 && (
                  <span className="text-[10px] text-transparent leading-none mb-0.5">·</span>
                )}
                <span className={`text-sm font-mono font-bold ${theme.text}`}>{fmt(v)}</span>
              </div>
              {i < arr.length - 1 && (
                <span className={`text-sm ${theme.subText}`}>→</span>
              )}
            </React.Fragment>
          ))
        )}
      </div>
    </div>
  )
}

/* ─── Object / HashMap ──────────────────────────────────── */
function ObjectBlock({ item, theme, label }) {
  const entries = item.value && typeof item.value === 'object'
    ? Object.entries(item.value)
    : []
  return (
    <div>
      <SectionLabel name={item.name} type={label ?? item.type} theme={theme} />
      <div className={`rounded-xl overflow-hidden border border-orange-400/20 ${theme.sidebarBg}`}>
        {entries.length === 0 ? (
          <p className={`text-xs ${theme.subText} px-3 py-2`}>&#123; &#125;</p>
        ) : (
          entries.map(([k, v], i) => (
            <div
              key={k}
              className={`
                flex items-center gap-3 px-3 py-1.5
                ${i < entries.length - 1 ? 'border-b border-orange-400/10' : ''}
                transition-colors duration-200
              `}
            >
              <span className={`text-xs font-mono font-semibold ${theme.jsonKey} min-w-[4rem] truncate`}>{k}</span>
              <span className={`text-xs ${theme.subText} select-none`}>:</span>
              <span className={`text-xs font-mono ${theme.text} truncate`}>{fmt(v)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/* ─── Primitive ─────────────────────────────────────────── */
function PrimitiveBlock({ item, theme }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`text-xs font-mono font-semibold ${theme.jsonKey}`}>{item.name}</span>
      <span className={`text-xs ${theme.subText}`}>=</span>
      <span className={`text-sm font-mono font-bold ${theme.text}`}>{fmt(item.value)}</span>
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full bg-gray-400/20 text-gray-400 ml-auto`}>
        {typeof item.value}
      </span>
    </div>
  )
}

/* ─── Helpers ───────────────────────────────────────────── */
function fmt(v) {
  if (v === null) return 'null'
  if (v === undefined) return 'undef'
  if (typeof v === 'string') return `"${v}"`
  if (typeof v === 'object') return Array.isArray(v) ? `[…${v.length}]` : '{…}'
  return String(v)
}
