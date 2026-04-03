import React, { useMemo, useEffect, useRef, useState } from 'react'
import ReactFlow, {
  Background,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { buildVisualizerState } from './VisualizerAdapter.js'
import useGraphStore from '../store/graphStore.js'

// ─── Custom node types (module-level — stable references) ────────────────

function GlassNode({ data }) {
  const active = data.isActive
  // Theme-aware colors passed via data, with fallback to defaults
  const activeColor   = data.activeColor   ?? 'rgba(74,222,128,0.85)'
  const activeBg      = data.activeBg      ?? 'rgba(74,222,128,0.18)'
  const activeGlow    = data.activeGlow    ?? 'rgba(74,222,128,0.5)'
  const activeTxt     = data.activeTxt     ?? '#4ade80'

  return (
    <div style={{
      background: active ? activeBg : 'rgba(255,255,255,0.09)',
      border: `2px solid ${active ? activeColor : 'rgba(255,255,255,0.20)'}`,
      backdropFilter: 'blur(10px)',
      borderRadius: 12,
      padding: '7px 18px',
      minWidth: 44,
      textAlign: 'center',
      fontSize: 14,
      fontWeight: 700,
      fontFamily: 'monospace',
      color: active ? activeTxt : '#e2e8f0',
      boxShadow: active
        ? `0 0 18px ${activeGlow}, 0 2px 8px rgba(0,0,0,0.35)`
        : '0 2px 14px rgba(0,0,0,0.28)',
      transition: 'all 0.3s ease',
      userSelect: 'none',
      cursor: 'grab',
    }}>
      {data.label}
      {data.varName && (
        <div style={{
          fontSize: 9,
          fontWeight: 400,
          color: active ? `${activeTxt}b3` : 'rgba(148,163,184,0.6)',
          marginTop: 3,
          letterSpacing: '0.04em',
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
      border: '1.5px dashed rgba(255,255,255,0.13)',
      borderRadius: 10,
      padding: '5px 12px',
      fontSize: 12,
      fontFamily: 'monospace',
      color: '#475569',
      userSelect: 'none',
    }}>
      ∅
    </div>
  )
}

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

  // Authoritative: show graph canvas if store has nodes OR structures declare graph types
  const graphNodeCount = useGraphStore(s => s.nodes.length)
  const graphTypes = new Set(['tree', 'linkedlist'])

  if (!structures || structures.length === 0) {
    return <p className={`text-xs ${theme.subText} select-none`}>No variables</p>
  }

  const blockItems = structures.filter(s => !graphTypes.has(s.type))
  const hasGraph   = graphNodeCount > 0 || structures.some(s => graphTypes.has(s.type))

  return (
    <div className="flex flex-col gap-4 w-full">
      {hasGraph && <GraphCanvas theme={theme} />}
      {blockItems.map(item => (
        <StructureBlock key={item.name} item={item} theme={theme} />
      ))}
    </div>
  )
}

// ─── Graph canvas ─────────────────────────────────────────────────────────

function GraphCanvasInner({ theme }) {
  const nodes         = useGraphStore(s => s.nodes)
  const edges         = useGraphStore(s => s.edges)
  const onNodesChange = useGraphStore(s => s.onNodesChange)
  const { fitView }   = useReactFlow()
  const fittedRef     = useRef(false)
  const [ready, setReady] = useState(false)

  // Mark ready after first paint so ReactFlow has measured its container
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // Fit view whenever node count changes (and container is ready)
  useEffect(() => {
    if (!ready || nodes.length === 0) return
    fittedRef.current = false
    const id1 = requestAnimationFrame(() => {
      const id2 = requestAnimationFrame(() => {
        fitView({ padding: 0.25, duration: 300 })
        fittedRef.current = true
      })
      return () => cancelAnimationFrame(id2)
    })
    return () => cancelAnimationFrame(id1)
  }, [nodes.length, ready, fitView])

  // Dynamic height: deepest node y + generous padding
  const maxY   = nodes.reduce((m, n) => Math.max(m, (n.position?.y ?? 0) + 60), 0)
  const height = Math.max(220, maxY + 120)

  // Theme-aware accent for active nodes — inject into node data
  const themedNodes = useMemo(() => nodes.map(n => {
    if (n.type !== 'glassNode') return n
    return {
      ...n,
      data: {
        ...n.data,
        activeColor: theme.graphActive  ?? 'rgba(74,222,128,0.85)',
        activeBg:    theme.graphActiveBg ?? 'rgba(74,222,128,0.18)',
        activeGlow:  theme.graphGlow     ?? 'rgba(74,222,128,0.5)',
        activeTxt:   theme.graphActiveTxt ?? '#4ade80',
      },
    }
  }), [nodes, theme])

  return (
    <div
      style={{ width: '100%', height, minHeight: 220 }}
      className={`rounded-xl overflow-hidden border border-white/10 ${theme.sidebarBg}`}
    >
      <ReactFlow
        nodes={themedNodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        panOnScroll={false}
        panOnDrag={true}
        proOptions={{ hideAttribution: true }}
        style={{ background: 'transparent', width: '100%', height: '100%' }}
      >
        <Background
          color={theme.graphBgDot ?? '#334155'}
          gap={20}
          size={1}
          variant="dots"
        />
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
