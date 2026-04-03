import React, { useMemo } from 'react'
import ReactFlow, { Background, Controls, MarkerType } from 'reactflow'
import 'reactflow/dist/style.css'
import { buildVisualizerState, listToFlow, treeToFlow } from './VisualizerAdapter.js'

/**
 * VisualizerView (v2)
 *
 * Renders structured semantic data from VisualizerAdapter.
 * - tree / linkedlist  → React Flow canvas
 * - array / stack / queue / object / primitive → CSS block layout
 *
 * Props:
 *   variables     {Object}  current step variables
 *   prevVariables {Object}  previous step variables (for diff-based detection)
 *   theme         {Object}  theme tokens from themeStore
 */
export default function VisualizerView({ variables, prevVariables, theme }) {
  const { structures } = useMemo(
    () => buildVisualizerState({ variables }, prevVariables ? { variables: prevVariables } : null),
    [variables, prevVariables]
  )

  if (!structures || structures.length === 0) {
    return <p className={`text-xs ${theme.subText} select-none`}>No variables</p>
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {structures.map((item) => (
        <StructureBlock key={item.name} item={item} theme={theme} />
      ))}
    </div>
  )
}

// ─── Dispatcher ───────────────────────────────────────────────────────────

function StructureBlock({ item, theme }) {
  switch (item.type) {
    case 'array':      return <ArrayBlock item={item} theme={theme} />
    case 'stack':      return <StackBlock item={item} theme={theme} />
    case 'queue':      return <QueueBlock item={item} theme={theme} />
    case 'object':     return <ObjectBlock item={item} theme={theme} />
    case 'linkedlist': return <LinkedListBlock item={item} theme={theme} />
    case 'tree':       return <TreeBlock item={item} theme={theme} />
    default:           return <PrimitiveBlock item={item} theme={theme} />
  }
}

// ─── Section label ────────────────────────────────────────────────────────

const TYPE_COLORS = {
  array:      'bg-blue-400/20 text-blue-400',
  stack:      'bg-purple-400/20 text-purple-400',
  queue:      'bg-emerald-400/20 text-emerald-400',
  object:     'bg-orange-400/20 text-orange-400',
  primitive:  'bg-gray-400/20 text-gray-400',
  tree:       'bg-pink-400/20 text-pink-400',
  linkedlist: 'bg-yellow-400/20 text-yellow-400',
}

function SectionLabel({ name, type, theme, meta }) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <span className={`text-xs font-mono font-semibold ${theme.jsonKey}`}>{name}</span>
      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${TYPE_COLORS[type] ?? TYPE_COLORS.primitive}`}>
        {type}
      </span>
      {meta?.op && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-gray-400">
          {meta.op}
        </span>
      )}
    </div>
  )
}

// ─── Array ────────────────────────────────────────────────────────────────

function ArrayBlock({ item, theme }) {
  const arr = Array.isArray(item.value) ? item.value : []
  return (
    <div>
      <SectionLabel name={item.name} type="array" theme={theme} />
      <div className="flex flex-wrap gap-1.5">
        {arr.length === 0 ? (
          <span className={`text-xs ${theme.subText}`}>[ empty ]</span>
        ) : arr.map((v, i) => (
          <div key={i} className={`flex flex-col items-center rounded-xl px-3 py-1.5 min-w-[2.5rem] ${theme.sidebarBg} border border-blue-400/20 transition-all duration-200`}>
            <span className={`text-[10px] ${theme.subText} leading-none mb-0.5`}>{i}</span>
            <span className={`text-sm font-mono font-bold ${theme.text}`}>{fmt(v)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Stack (LIFO vertical) ────────────────────────────────────────────────

function StackBlock({ item, theme }) {
  const arr = Array.isArray(item.value) ? item.value : []
  const reversed = [...arr].reverse()
  return (
    <div>
      <SectionLabel name={item.name} type="stack" theme={theme} meta={item.meta} />
      <div className="flex flex-col gap-1">
        {arr.length === 0 ? (
          <span className={`text-xs ${theme.subText}`}>[ empty ]</span>
        ) : reversed.map((v, ri) => {
          const isTop = ri === 0
          return (
            <div key={ri} className={`flex items-center justify-between px-3 py-1.5 rounded-xl transition-all duration-200 ${isTop ? `${theme.panelBg} border-2 border-purple-400/40` : `${theme.sidebarBg} border border-purple-400/10`}`}>
              <span className={`text-sm font-mono font-bold ${theme.text}`}>{fmt(v)}</span>
              {isTop && <span className="text-purple-400 text-[10px] font-medium">← top</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Queue (FIFO horizontal) ──────────────────────────────────────────────

function QueueBlock({ item, theme }) {
  const arr = Array.isArray(item.value) ? item.value : []
  return (
    <div>
      <SectionLabel name={item.name} type="queue" theme={theme} meta={item.meta} />
      <div className="flex items-center flex-wrap gap-1">
        {arr.length === 0 ? (
          <span className={`text-xs ${theme.subText}`}>[ empty ]</span>
        ) : arr.map((v, i) => (
          <React.Fragment key={i}>
            <div className={`flex flex-col items-center rounded-xl px-3 py-1.5 min-w-[2.5rem] ${theme.sidebarBg} border border-emerald-400/20 transition-all duration-200`}>
              <span className={`text-[10px] text-emerald-400 leading-none mb-0.5`}>
                {i === 0 ? 'front' : i === arr.length - 1 ? 'rear' : '\u00a0'}
              </span>
              <span className={`text-sm font-mono font-bold ${theme.text}`}>{fmt(v)}</span>
            </div>
            {i < arr.length - 1 && (
              <span className={`text-sm ${theme.subText}`}>→</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

// ─── Object (key-value grid) ──────────────────────────────────────────────

function ObjectBlock({ item, theme }) {
  const entries = item.value && typeof item.value === 'object'
    ? Object.entries(item.value)
    : []
  return (
    <div>
      <SectionLabel name={item.name} type={item.type} theme={theme} />
      <div className={`rounded-xl overflow-hidden border border-orange-400/20 ${theme.sidebarBg}`}>
        {entries.length === 0 ? (
          <p className={`text-xs ${theme.subText} px-3 py-2`}>&#123; &#125;</p>
        ) : entries.map(([k, v], i) => (
          <div key={k} className={`flex items-center gap-3 px-3 py-1.5 transition-colors duration-200 ${i < entries.length - 1 ? 'border-b border-orange-400/10' : ''}`}>
            <span className={`text-xs font-mono font-semibold ${theme.jsonKey} min-w-[4rem] truncate`}>{k}</span>
            <span className={`text-xs ${theme.subText} select-none`}>:</span>
            <span className={`text-xs font-mono ${theme.text} truncate`}>{fmt(v)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Primitive ────────────────────────────────────────────────────────────

function PrimitiveBlock({ item, theme }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`text-xs font-mono font-semibold ${theme.jsonKey}`}>{item.name}</span>
      <span className={`text-xs ${theme.subText}`}>=</span>
      <span className={`text-sm font-mono font-bold ${theme.text}`}>{fmt(item.value)}</span>
      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-400/20 text-gray-400 ml-auto">
        {typeof item.value}
      </span>
    </div>
  )
}

// ─── Linked List (React Flow) ─────────────────────────────────────────────

function LinkedListBlock({ item, theme }) {
  const { nodes, edges } = useMemo(() => listToFlow(item.value), [item.value])

  // width = nodes * 130 + padding, capped at parent width
  const canvasW = Math.max(300, nodes.length * 130 + 60)

  return (
    <div>
      <SectionLabel name={item.name} type="linkedlist" theme={theme} />
      <div style={{ height: 90, width: '100%', overflow: 'hidden' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          zoomOnScroll={false}
          panOnScroll={false}
          panOnDrag={false}
          proOptions={{ hideAttribution: true }}
          style={{ borderRadius: 12, background: 'transparent' }}
        />
      </div>
    </div>
  )
}

// ─── Binary Tree (React Flow) ─────────────────────────────────────────────

function TreeBlock({ item, theme }) {
  const { nodes, edges } = useMemo(() => treeToFlow(item.value), [item.value])

  // Estimate height from depth
  function treeDepth(node, d = 0) {
    if (!node || typeof node !== 'object') return d
    return Math.max(treeDepth(node.left, d + 1), treeDepth(node.right, d + 1))
  }
  const depth = treeDepth(item.value)
  const canvasH = Math.max(140, depth * 90 + 60)

  return (
    <div>
      <SectionLabel name={item.name} type="tree" theme={theme} />
      <div style={{ height: canvasH, width: '100%', overflow: 'hidden' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          zoomOnScroll={false}
          panOnScroll={false}
          panOnDrag={false}
          proOptions={{ hideAttribution: true }}
          style={{ borderRadius: 12, background: 'transparent' }}
        />
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function fmt(v) {
  if (v === null) return 'null'
  if (v === undefined) return 'undef'
  if (typeof v === 'string') return `"${v}"`
  if (typeof v === 'object') return Array.isArray(v) ? `[…${v.length}]` : '{…}'
  return String(v)
}
