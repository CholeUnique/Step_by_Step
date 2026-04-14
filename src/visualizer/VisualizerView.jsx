import React, { useMemo, useEffect, useState } from 'react'
import ReactFlow, {
  Background,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow'
import 'reactflow/dist/style.css'
import useGraphStore from '../store/graphStore.js'

// ─── Pointer node (tree / linkedlist) ─────────────────────────────────────

function GlassNode({ data }) {
  const active      = data.isActive
  const activeColor = data.activeColor  ?? 'rgba(74,222,128,0.85)'
  const activeBg    = data.activeBg     ?? 'rgba(74,222,128,0.18)'
  const activeGlow  = data.activeGlow   ?? 'rgba(74,222,128,0.5)'
  const activeTxt   = data.activeTxt    ?? '#4ade80'

  return (
    <div style={{
      background:   active ? activeBg : 'rgba(255,255,255,0.09)',
      border:       `2px solid ${active ? activeColor : 'rgba(255,255,255,0.20)'}`,
      backdropFilter: 'blur(10px)',
      borderRadius: 12,
      padding:      '7px 18px',
      minWidth:     44,
      textAlign:    'center',
      fontSize:     14,
      fontWeight:   700,
      fontFamily:   'monospace',
      color:        active ? activeTxt : '#e2e8f0',
      boxShadow:    active
        ? `0 0 18px ${activeGlow}, 0 2px 8px rgba(0,0,0,0.35)`
        : '0 2px 14px rgba(0,0,0,0.28)',
      transition:   'all 0.3s ease',
      userSelect:   'none',
      cursor:       'grab',
    }}>
      {data.label}
      {data.varName && (
        <div style={{
          fontSize:    9,
          fontWeight:  400,
          color:       active ? `${activeTxt}b3` : 'rgba(148,163,184,0.6)',
          marginTop:   3,
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
      background:   'rgba(255,255,255,0.03)',
      border:       '1.5px dashed rgba(255,255,255,0.13)',
      borderRadius: 10,
      padding:      '5px 12px',
      fontSize:     12,
      fontFamily:   'monospace',
      color:        '#475569',
      userSelect:   'none',
    }}>
      ∅
    </div>
  )
}

// ─── Card node (array / stack / queue / matrix / object / primitive) ───────

const TYPE_BORDER = {
  array:     'rgba(96,165,250,0.5)',
  stack:     'rgba(167,139,250,0.5)',
  queue:     'rgba(52,211,153,0.5)',
  matrix:    'rgba(251,191,36,0.5)',
  object:    'rgba(251,146,60,0.5)',
  primitive: 'rgba(148,163,184,0.4)',
}

const TYPE_LABEL_COLOR = {
  array:     '#60a5fa',
  stack:     '#a78bfa',
  queue:     '#34d399',
  matrix:    '#fbbf24',
  object:    '#fb923c',
  primitive: '#94a3b8',
}

function CardNode({ data }) {
  const active      = data.isActive
  const activeGlow  = data.activeGlow  ?? 'rgba(74,222,128,0.5)'
  const borderColor = active
    ? (data.activeColor ?? 'rgba(74,222,128,0.85)')
    : (TYPE_BORDER[data.structType] ?? 'rgba(255,255,255,0.15)')
  const labelColor  = TYPE_LABEL_COLOR[data.structType] ?? '#94a3b8'
  const typeLabel   = data.structType?.toUpperCase() ?? '?'

  return (
    <div style={{
      background:   active ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.05)',
      border:       `1.5px solid ${borderColor}`,
      borderRadius: 14,
      padding:      '8px 12px',
      minWidth:     130,
      maxWidth:     260,
      fontFamily:   'monospace',
      boxShadow:    active
        ? `0 0 18px ${activeGlow}, 0 2px 10px rgba(0,0,0,0.3)`
        : '0 2px 10px rgba(0,0,0,0.2)',
      transition:   'all 0.3s ease',
      userSelect:   'none',
      cursor:       'grab',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0' }}>{data.name}</span>
        <span style={{
          fontSize: 9, fontWeight: 600,
          color: labelColor,
          background: `${labelColor}22`,
          padding: '1px 6px',
          borderRadius: 20,
          letterSpacing: '0.05em',
        }}>{typeLabel}{data.meta?.op ? ` · ${data.meta.op}` : ''}</span>
      </div>
      {/* Content */}
      <CardContent structType={data.structType} value={data.value} labelColor={labelColor} />
    </div>
  )
}

function CardContent({ structType, value, labelColor }) {
  if (structType === 'primitive') {
    return (
      <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>
        {fmtVal(value)}
        <span style={{ fontSize: 9, color: '#64748b', marginLeft: 6 }}>{typeof value}</span>
      </div>
    )
  }

  if (structType === 'object') {
    const entries = value && typeof value === 'object'
      ? Object.entries(value).filter(([k]) => k !== '__id__')
      : []
    if (entries.length === 0) return <span style={{ fontSize: 11, color: '#475569' }}>&#123; &#125;</span>
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {entries.slice(0, 8).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', gap: 6, fontSize: 11 }}>
            <span style={{ color: labelColor, minWidth: 40, fontWeight: 600 }}>{k}</span>
            <span style={{ color: '#94a3b8' }}>:</span>
            <span style={{ color: '#e2e8f0' }}>{fmtVal(v)}</span>
          </div>
        ))}
        {entries.length > 8 && <span style={{ fontSize: 9, color: '#475569' }}>+{entries.length - 8} more</span>}
      </div>
    )
  }

  if (structType === 'matrix') {
    const rows = Array.isArray(value) ? value : []
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {rows.slice(0, 6).map((row, ri) => (
          <div key={ri} style={{ display: 'flex', gap: 3 }}>
            {Array.isArray(row) && row.slice(0, 8).map((v, ci) => (
              <span key={ci} style={{
                fontSize: 10, fontWeight: 700, color: '#e2e8f0',
                background: 'rgba(255,255,255,0.07)',
                borderRadius: 4, padding: '1px 4px',
                minWidth: 18, textAlign: 'center',
              }}>{fmtVal(v)}</span>
            ))}
            {Array.isArray(row) && row.length > 8 && <span style={{ fontSize: 9, color: '#475569' }}>…</span>}
          </div>
        ))}
        {rows.length > 6 && <span style={{ fontSize: 9, color: '#475569' }}>+{rows.length - 6} rows</span>}
      </div>
    )
  }

  // array / stack / queue
  const arr = Array.isArray(value) ? value : []
  const isStack = structType === 'stack'
  const isQueue = structType === 'queue'

  if (arr.length === 0) return <span style={{ fontSize: 11, color: '#475569' }}>[ empty ]</span>

  if (isStack) {
    const reversed = [...arr].reverse()
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {reversed.slice(0, 8).map((v, ri) => (
          <div key={ri} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: ri === 0 ? 'rgba(167,139,250,0.12)' : 'rgba(255,255,255,0.04)',
            border:     ri === 0 ? '1px solid rgba(167,139,250,0.3)' : '1px solid rgba(255,255,255,0.06)',
            borderRadius: 6, padding: '2px 7px', fontSize: 12, fontWeight: 700, color: '#e2e8f0',
          }}>
            {fmtVal(v)}
            {ri === 0 && <span style={{ fontSize: 9, color: '#a78bfa', marginLeft: 6 }}>top</span>}
          </div>
        ))}
        {arr.length > 8 && <span style={{ fontSize: 9, color: '#475569' }}>+{arr.length - 8} more</span>}
      </div>
    )
  }

  // array or queue — horizontal cells
  return (
    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
      {arr.slice(0, 12).map((v, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {isQueue && (
            <span style={{ fontSize: 8, color: labelColor, marginBottom: 1 }}>
              {i === 0 ? 'F' : i === arr.length - 1 ? 'R' : ''}
            </span>
          )}
          <span style={{
            fontSize: 11, fontWeight: 700, color: '#e2e8f0',
            background: 'rgba(255,255,255,0.07)',
            borderRadius: 5, padding: '2px 6px',
            minWidth: 20, textAlign: 'center',
          }}>{fmtVal(v)}</span>
          {!isQueue && <span style={{ fontSize: 8, color: '#475569' }}>{i}</span>}
        </div>
      ))}
      {arr.length > 12 && <span style={{ fontSize: 9, color: '#475569', alignSelf: 'center' }}>+{arr.length - 12}</span>}
    </div>
  )
}

// ─── Module-level stable node types map ───────────────────────────────────

const NODE_TYPES = { glassNode: GlassNode, nullNode: NullNode, cardNode: CardNode }

// ─── Main export ───────────────────────────────────────────────────────────

/**
 * VisualizerView: single ReactFlowProvider always mounted.
 * All data structures render as persistent canvas nodes.
 */
export default function VisualizerView({ theme }) {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 260 }}>
      <GraphCanvas theme={theme} />
    </div>
  )
}

// ─── Graph canvas (always mounted) ────────────────────────────────────────

function GraphCanvasInner({ theme }) {
  const nodes          = useGraphStore(s => s.nodes)
  const edges          = useGraphStore(s => s.edges)
  const onNodesChange  = useGraphStore(s => s.onNodesChange)
  const { fitView }    = useReactFlow()
  const [ready, setReady] = useState(false)

  // Mark ready after first paint
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // Fit view whenever nodes change and container is ready
  useEffect(() => {
    if (!ready || nodes.length === 0) return
    const id1 = requestAnimationFrame(() => {
      const id2 = requestAnimationFrame(() => {
        fitView({ padding: 0.2, duration: 300 })
      })
      return () => cancelAnimationFrame(id2)
    })
    return () => cancelAnimationFrame(id1)
  }, [nodes, ready, fitView])

  // Inject theme tokens into glassNode data
  const themedNodes = useMemo(() => nodes.map(n => {
    if (n.type !== 'glassNode' && n.type !== 'cardNode') return n
    return {
      ...n,
      data: {
        ...n.data,
        activeColor: theme.graphActive    ?? 'rgba(74,222,128,0.85)',
        activeBg:    theme.graphActiveBg  ?? 'rgba(74,222,128,0.18)',
        activeGlow:  theme.graphGlow      ?? 'rgba(74,222,128,0.5)',
        activeTxt:   theme.graphActiveTxt ?? '#4ade80',
      },
    }
  }), [nodes, theme])

  return (
    <div
      style={{ width: '100%', height: '100%', minHeight: 260, position: 'relative' }}
      className={`rounded-xl border border-white/10 ${theme.sidebarBg}`}
    >
      <ReactFlow
        nodes={themedNodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        fitView
        fitViewOptions={{ padding: 0.2 }}
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

// ─── Helpers ──────────────────────────────────────────────────────────────

function fmtVal(v) {
  if (v === null)      return 'null'
  if (v === undefined) return 'undef'
  if (typeof v === 'string')  return `"${v}"`
  if (typeof v === 'object')  return Array.isArray(v) ? `[…${v.length}]` : '{…}'
  return String(v)
}
