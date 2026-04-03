import React, { useMemo, useEffect, useCallback } from 'react'
import ReactFlow, {
  Background,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { buildVisualizerState } from './VisualizerAdapter.js'
import useGraphStore from '../store/graphStore.js'

// ─── Custom node types (defined at module level — stable references) ──────

function GlassNode({ data }) {
  const active = data.isActive
  return (
    <div
      style={{
        background: active ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.08)',
        border: active ? '2px solid rgba(74,222,128,0.8)' : '1.5px solid rgba(255,255,255,0.18)',
        backdropFilter: 'blur(8px)',
        borderRadius: 12,
        padding: '6px 16px',
        minWidth: 42,
        textAlign: 'center',
        fontSize: 13,
        fontWeight: 700,
        fontFamily: 'monospace',
        color: active ? '#4ade80' : '#e2e8f0',
        boxShadow: active
          ? '0 0 16px rgba(74,222,128,0.5), 0 2px 8px rgba(0,0,0,0.3)'
          : '0 2px 12px rgba(0,0,0,0.25)',
        transition: 'all 0.3s ease',
        userSelect: 'none',
      }}
    >
      {data.label}
      {data.varName && (
        <div style={{
          fontSize: 9,
          fontWeight: 400,
          color: active ? 'rgba(74,222,128,0.7)' : 'rgba(148,163,184,0.7)',
          marginTop: 2,
          letterSpacing: '0.03em',
        }}>
          {data.varName}
        </div>
      )}
    </div>
  )
}

function NullNode() {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1.5px dashed rgba(255,255,255,0.15)',
      borderRadius: 12,
      padding: '6px 14px',
      fontSize: 12,
      fontFamily: 'monospace',
      color: '#64748b',
      userSelect: 'none',
    }}>
      ∅
    </div>
  )
}

// Must be stable — defined outside any component
const NODE_TYPES = { glassNode: GlassNode, nullNode: NullNode }

// ─── Main component ───────────────────────────────────────────────────────

export default function VisualizerView({ variables, prevVariables, theme }) {
  const { structures } = useMemo(
    () => buildVisualizerState(
      { variables },
      prevVariables ? { variables: prevVariables } : null
    ),
    [variables, prevVariables]
  )

  // Subscribe to graphStore to decide whether to show the canvas
  const graphNodes = useGraphStore(s => s.nodes)

  if (!structures || structures.length === 0) {
    return <p className={`text-xs ${theme.subText} select-none`}>No variables</p>
  }

  const graphTypes = new Set(['tree', 'linkedlist'])
  const blockItems = structures.filter(s => !graphTypes.has(s.type))
  // Show canvas when store has nodes (authoritative) OR structures declare graph types
  const hasGraph = graphNodes.length > 0 || structures.some(s => graphTypes.has(s.type))

  return (
    <div className="flex flex-col gap-4 w-full">
      {hasGraph && <GraphCanvas theme={theme} />}
      {blockItems.map(item => (
        <StructureBlock key={item.name} item={item} theme={theme} />
      ))}
    </div>
  )
}

// ─── Unified graph canvas ─────────────────────────────────────────────────
// Wraps ReactFlow in its own Provider so useReactFlow() works inside.

function GraphCanvasInner({ theme }) {
  const { nodes, edges, onNodesChange } = useGraphStore()
  const { fitView } = useReactFlow()

  // Re-fit every time nodes change so newly added nodes are always visible
  useEffect(() => {
    if (nodes.length > 0) {
      // Small timeout lets React Flow finish its layout pass first
      const id = setTimeout(() => fitView({ padding: 0.3, duration: 200 }), 50)
      return () => clearTimeout(id)
    }
  }, [nodes, fitView])

  // Height: deepest node y + node height estimate + padding
  const maxY = nodes.reduce((m, n) => Math.max(m, (n.position?.y ?? 0)), 0)
  const height = Math.max(180, maxY + 130)

  return (
    <div
      style={{ width: '100%', height }}
      className={`rounded-xl overflow-hidden border border-white/10 ${theme.sidebarBg}`}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        panOnScroll={false}
        panOnDrag={true}
        proOptions={{ hideAttribution: true }}
        style={{ background: 'transparent' }}
      >
        <Background color="#334155" gap={20} size={1} variant="dots" />
      </ReactFlow>
    </div>
  )
}

function GraphCanvas({ theme }) {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner theme={theme} />
    </ReactFlowProvider>
  )
}

// ─── Block dispatcher ─────────────────────────────────────────────────────

function StructureBlock({ item, theme }) {
  switch (item.type) {
    case 'array':   return <ArrayBlock   item={item} theme={theme} />
    case 'stack':   return <StackBlock   item={item} theme={theme} />
    case 'queue':   return <QueueBlock   item={item} theme={theme} />
    case 'object':  return <ObjectBlock  item={item} theme={theme} />
    default:        return <PrimitiveBlock item={item} theme={theme} />
  }
}

// ─── Section label ────────────────────────────────────────────────────────

const TYPE_COLORS = {
  array:     'bg-blue-400/20 text-blue-400',
  stack:     'bg-purple-400/20 text-purple-400',
  queue:     'bg-emerald-400/20 text-emerald-400',
  object:    'bg-orange-400/20 text-orange-400',
  primitive: 'bg-gray-400/20 text-gray-400',
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
        {arr.length === 0
          ? <span className={`text-xs ${theme.subText}`}>[ empty ]</span>
          : arr.map((v, i) => (
            <div key={i} className={`flex flex-col items-center rounded-xl px-3 py-1.5 min-w-[2.5rem] ${theme.sidebarBg} border border-blue-400/20 transition-all duration-200`}>
              <span className={`text-[10px] ${theme.subText} leading-none mb-0.5`}>{i}</span>
              <span className={`text-sm font-mono font-bold ${theme.text}`}>{fmt(v)}</span>
            </div>
          ))
        }
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
        {arr.length === 0
          ? <span className={`text-xs ${theme.subText}`}>[ empty ]</span>
          : reversed.map((v, ri) => {
              const isTop = ri === 0
              return (
                <div key={ri} className={`flex items-center justify-between px-3 py-1.5 rounded-xl transition-all duration-200 ${isTop ? `${theme.panelBg} border-2 border-purple-400/40` : `${theme.sidebarBg} border border-purple-400/10`}`}>
                  <span className={`text-sm font-mono font-bold ${theme.text}`}>{fmt(v)}</span>
                  {isTop && <span className="text-purple-400 text-[10px] font-medium">← top</span>}
                </div>
              )
            })
        }
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
        {arr.length === 0
          ? <span className={`text-xs ${theme.subText}`}>[ empty ]</span>
          : arr.map((v, i) => (
            <React.Fragment key={i}>
              <div className={`flex flex-col items-center rounded-xl px-3 py-1.5 min-w-[2.5rem] ${theme.sidebarBg} border border-emerald-400/20 transition-all duration-200`}>
                <span className="text-[10px] text-emerald-400 leading-none mb-0.5">
                  {i === 0 ? 'front' : i === arr.length - 1 ? 'rear' : '\u00a0'}
                </span>
                <span className={`text-sm font-mono font-bold ${theme.text}`}>{fmt(v)}</span>
              </div>
              {i < arr.length - 1 && <span className={`text-sm ${theme.subText}`}>→</span>}
            </React.Fragment>
          ))
        }
      </div>
    </div>
  )
}

// ─── Object (key-value grid) ──────────────────────────────────────────────

function ObjectBlock({ item, theme }) {
  const entries = item.value && typeof item.value === 'object'
    ? Object.entries(item.value).filter(([k]) => k !== '__id__')
    : []
  return (
    <div>
      <SectionLabel name={item.name} type="object" theme={theme} />
      <div className={`rounded-xl overflow-hidden border border-orange-400/20 ${theme.sidebarBg}`}>
        {entries.length === 0
          ? <p className={`text-xs ${theme.subText} px-3 py-2`}>&#123; &#125;</p>
          : entries.map(([k, v], i) => (
            <div key={k} className={`flex items-center gap-3 px-3 py-1.5 transition-colors duration-200 ${i < entries.length - 1 ? 'border-b border-orange-400/10' : ''}`}>
              <span className={`text-xs font-mono font-semibold ${theme.jsonKey} min-w-[4rem] truncate`}>{k}</span>
              <span className={`text-xs ${theme.subText} select-none`}>:</span>
              <span className={`text-xs font-mono ${theme.text} truncate`}>{fmt(v)}</span>
            </div>
          ))
        }
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

// ─── Helpers ──────────────────────────────────────────────────────────────

function fmt(v) {
  if (v === null) return 'null'
  if (v === undefined) return 'undef'
  if (typeof v === 'string') return `"${v}"`
  if (typeof v === 'object') return Array.isArray(v) ? `[…${v.length}]` : '{…}'
  return String(v)
}
