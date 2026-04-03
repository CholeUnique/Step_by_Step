/**
 * GraphStore (Zustand)
 *
 * Single source of truth for the React Flow canvas.
 * Implements "incremental / heap-persistent" graph updates:
 *   - Nodes are NEVER deleted once created (simulates heap memory).
 *   - On each step, existing nodes are updated in-place; new nodes are appended.
 *   - Edges are fully recomputed from the current node set (next / left / right).
 *   - Nodes that were just created or whose value changed are marked isActive=true.
 *   - isActive is cleared after ACTIVE_TTL steps.
 *
 * Consumed by: VisualizerView (tree / linkedlist blocks).
 * Updated by:  Visualizer.jsx on every snap change.
 */

import { create } from 'zustand'

const ACTIVE_TTL = 2   // steps before the highlight fades

// ─── Layout constants ──────────────────────────────────────────────────────
const LIST_X_STEP = 150
const TREE_Y_STEP = 100
const TREE_X_SPREAD = 140

// ─── Store ─────────────────────────────────────────────────────────────────

const useGraphStore = create((set, get) => ({
  /** @type {import('reactflow').Node[]} */
  nodes: [],
  /** @type {import('reactflow').Edge[]} */
  edges: [],
  /** Internal metadata keyed by node id */
  _meta: {},   // { [id]: { activeSince: stepIndex } }
  /** Current global step counter */
  _step: 0,

  /**
   * Main update entry point.
   * Called by Visualizer.jsx after each timeline step.
   *
   * @param {Array<{type,name,value}>} structures  Output of buildVisualizerState
   * @param {number} stepIndex
   */
  updateGraph(structures, stepIndex) {
    const state = get()
    const prevNodes = state.nodes
    const prevMeta  = state._meta

    // ── 1. Collect all "graph-able" objects (tree nodes + list nodes) ──────
    const objectMap = new Map()   // __id__ → { value, varName, type, position? }

    for (const s of structures) {
      if (s.type === 'tree' || s.type === 'linkedlist') {
        collectObjects(s.value, objectMap, s.name, s.type)
      }
    }

    if (objectMap.size === 0) return  // nothing graphable this step

    // ── 2. Assign / reuse positions ────────────────────────────────────────
    const positionMap = assignPositions(objectMap, prevNodes)

    // ── 3. Build new nodes array (incremental merge) ───────────────────────
    const newMeta = { ...prevMeta }
    const existingIds = new Set(prevNodes.map(n => n.id))
    const updatedNodes = [...prevNodes]

    for (const [id, info] of objectMap.entries()) {
      const label = getLabel(info.value)
      const isNew = !existingIds.has(id)
      const prevNode = prevNodes.find(n => n.id === id)
      const valueChanged = prevNode && prevNode.data.rawLabel !== label

      if (isNew || valueChanged) {
        newMeta[id] = { activeSince: stepIndex }
      }

      const isActive = newMeta[id]
        ? (stepIndex - newMeta[id].activeSince) < ACTIVE_TTL
        : false

      const nodeData = {
        label,
        rawLabel: label,
        isActive,
        varName: isNew ? info.varName : (prevNode?.data.varName ?? info.varName),
      }

      if (isNew) {
        updatedNodes.push({
          id,
          type: 'glassNode',
          data: nodeData,
          position: positionMap.get(id) ?? { x: 0, y: 0 },
        })
        existingIds.add(id)
      } else {
        const idx = updatedNodes.findIndex(n => n.id === id)
        if (idx !== -1) {
          updatedNodes[idx] = {
            ...updatedNodes[idx],
            data: nodeData,
          }
        }
      }
    }

    // Refresh isActive for nodes NOT in the current objectMap (they may still be TTL-active)
    for (let i = 0; i < updatedNodes.length; i++) {
      const n = updatedNodes[i]
      if (!objectMap.has(n.id)) {
        const meta = newMeta[n.id]
        const isActive = meta ? (stepIndex - meta.activeSince) < ACTIVE_TTL : false
        if (n.data.isActive !== isActive) {
          updatedNodes[i] = { ...n, data: { ...n.data, isActive } }
        }
      }
    }

    // ── 4. Recompute edges from the full node set ──────────────────────────
    const newEdges = buildEdges(objectMap, updatedNodes)

    set({ nodes: updatedNodes, edges: newEdges, _meta: newMeta, _step: stepIndex })
  },

  /** Full reset — call on interpreter init */
  reset() {
    set({ nodes: [], edges: [], _meta: {}, _step: 0 })
  },

  /** Called by ReactFlow when user drags a node */
  onNodesChange(changes) {
    set(state => ({
      nodes: applyNodeChanges(changes, state.nodes),
    }))
  },
}))

export default useGraphStore

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Recursively collect all graph-able objects in a tree/list value.
 * Writes into objectMap: id → { value, varName, type }
 */
function collectObjects(node, map, varName, type, visited = new Set()) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return
  const id = node.__id__
  if (!id || visited.has(id)) return
  visited.add(id)
  map.set(id, { value: node, varName, type })

  if (node.next && typeof node.next === 'object') {
    collectObjects(node.next, map, varName, type, visited)
  }
  if (node.left && typeof node.left === 'object') {
    collectObjects(node.left, map, varName, type, visited)
  }
  if (node.right && typeof node.right === 'object') {
    collectObjects(node.right, map, varName, type, visited)
  }
}

/**
 * Assign positions to new nodes.
 * - Existing nodes keep their current position (user may have dragged them).
 * - New nodes get a simple layout: list = horizontal, tree = recursive.
 */
function assignPositions(objectMap, prevNodes) {
  const posMap = new Map()
  const existingPos = new Map(prevNodes.map(n => [n.id, n.position]))

  // Separate list roots from tree roots
  // For simplicity: do one layout pass per connected component
  // We detect roots: nodes that are not pointed to by any other node
  const pointed = new Set()
  for (const [, info] of objectMap.entries()) {
    const v = info.value
    if (v.next?.__id__) pointed.add(v.next.__id__)
    if (v.left?.__id__) pointed.add(v.left.__id__)
    if (v.right?.__id__) pointed.add(v.right.__id__)
  }

  const roots = [...objectMap.keys()].filter(id => !pointed.has(id))

  let listX = 20
  let treeX = 20

  for (const rootId of roots) {
    const info = objectMap.get(rootId)
    if (!info) continue

    if (info.type === 'linkedlist') {
      // Lay out the chain horizontally
      let cur = info.value
      let x = listX
      const visited = new Set()
      while (cur && cur.__id__ && !visited.has(cur.__id__)) {
        visited.add(cur.__id__)
        if (!existingPos.has(cur.__id__)) {
          posMap.set(cur.__id__, { x, y: 20 })
        } else {
          posMap.set(cur.__id__, existingPos.get(cur.__id__))
        }
        x += LIST_X_STEP
        cur = cur.next
      }
      listX = x + 40
    } else {
      // Tree layout
      const treeW = countNodes(info.value) * 60
      layoutTree(info.value, treeX + treeW / 2, 20, TREE_X_SPREAD, posMap, existingPos, new Set())
      treeX += treeW + 80
    }
  }

  return posMap
}

function layoutTree(node, x, y, spread, posMap, existingPos, visited) {
  if (!node || typeof node !== 'object' || !node.__id__) return
  if (visited.has(node.__id__)) return
  visited.add(node.__id__)

  if (!existingPos.has(node.__id__)) {
    posMap.set(node.__id__, { x, y })
  } else {
    posMap.set(node.__id__, existingPos.get(node.__id__))
  }

  if (node.left?.__id__) {
    layoutTree(node.left, x - spread, y + TREE_Y_STEP, Math.max(spread / 2, 40), posMap, existingPos, visited)
  }
  if (node.right?.__id__) {
    layoutTree(node.right, x + spread, y + TREE_Y_STEP, Math.max(spread / 2, 40), posMap, existingPos, visited)
  }
}

function countNodes(node, visited = new Set()) {
  if (!node || typeof node !== 'object' || !node.__id__) return 0
  if (visited.has(node.__id__)) return 0
  visited.add(node.__id__)
  return 1 + countNodes(node.left, visited) + countNodes(node.right, visited)
}

/**
 * Build edges from the full objectMap using next/left/right pointer fields.
 */
function buildEdges(objectMap, allNodes) {
  const edges = []
  const nodeIdSet = new Set(allNodes.map(n => n.id))

  for (const [id, info] of objectMap.entries()) {
    if (!nodeIdSet.has(id)) continue
    const v = info.value

    for (const ptr of ['next', 'left', 'right']) {
      const child = v[ptr]
      if (child && typeof child === 'object' && child.__id__ && nodeIdSet.has(child.__id__)) {
        edges.push({
          id: `e-${id}-${ptr}`,
          source: id,
          target: child.__id__,
          label: ptr,
          type: 'smoothstep',
          animated: true,
          markerEnd: { type: 'arrowclosed' },
          style: { strokeWidth: 1.5 },
          labelStyle: { fontSize: 10, fill: '#94a3b8' },
          labelBgStyle: { fill: 'transparent' },
        })
      }
    }
  }

  return edges
}

function getLabel(value) {
  const v = value.val !== undefined ? value.val : value.value
  return v !== undefined ? String(v) : '?'
}

/**
 * Minimal applyNodeChanges — handles 'position' changes from dragging.
 * We only need to handle position changes; other change types are no-ops.
 */
function applyNodeChanges(changes, nodes) {
  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  for (const change of changes) {
    if (change.type === 'position' && change.id && change.position) {
      const n = nodeMap.get(change.id)
      if (n) nodeMap.set(change.id, { ...n, position: change.position })
    }
  }
  return [...nodeMap.values()]
}
