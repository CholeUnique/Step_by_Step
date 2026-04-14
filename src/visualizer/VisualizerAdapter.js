/**
 * VisualizerAdapter (v2)
 *
 * Converts two consecutive timeline snapshots (current + previous) into
 * structured semantic data for VisualizerView to render.
 *
 * Detection priority per variable:
 *  1. isLinkedList(value)                     → type: "linkedlist"
 *  2. isTree(value)                           → type: "tree"
 *  3. Array.isArray(value)
 *       + diff vs previous → stack behaviour  → type: "stack",  meta: { op }
 *       + diff vs previous → queue behaviour  → type: "queue",  meta: { op }
 *       + otherwise                           → type: "array"
 *  4. typeof value === "object" (non-null)    → type: "object"
 *  5. primitive                               → type: "primitive"
 *
 * Stack heuristic (LIFO, based purely on diff — NOT variable name):
 *   push: curr.length === prev.length + 1  AND  prev elements are a prefix of curr
 *   pop:  curr.length === prev.length - 1  AND  curr elements are a prefix of prev
 *
 * Queue heuristic (FIFO, based purely on diff — NOT variable name):
 *   shift: curr.length === prev.length - 1  AND  first element differs (front dequeue)
 *   enqueue: curr.length === prev.length + 1 AND last element added (rear enqueue)
 *
 * Input:
 *   currentSnap  — timeline snapshot ({ variables, ... })
 *   previousSnap — previous snapshot, or null for step 0
 *
 * Output:
 *   { structures: Array<StructureItem> }
 *
 * StructureItem:
 *   { type: string, name: string, value: any, meta?: object }
 */

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * @param {{ variables: Object }} currentSnap
 * @param {{ variables: Object } | null} previousSnap
 * @returns {{ structures: Array }}
 */
export function buildVisualizerState(currentSnap, previousSnap) {
  const curr = currentSnap?.variables ?? {}
  const prev = previousSnap?.variables ?? {}

  const structures = Object.entries(curr).map(([name, value]) => {
    const prevValue = prev[name]
    return detectStructure(name, value, prevValue)
  })

  return { structures }
}

// ─── Structure detectors ───────────────────────────────────────────────────

function detectStructure(name, value, prevValue) {
  // 1. Linked list node
  if (isLinkedList(value)) {
    return { type: 'linkedlist', name, value }
  }

  // 2. Binary tree node
  if (isTree(value)) {
    return { type: 'tree', name, value }
  }

  // 3. Array with diff-based classification
  if (Array.isArray(value)) {
    // 3a. 2-D matrix: array where every element is also an array
    if (value.length > 0 && value.every(row => Array.isArray(row))) {
      return { type: 'matrix', name, value }
    }

    const prevArr = Array.isArray(prevValue) ? prevValue : null
    const stackOp = prevArr !== null ? detectStackOp(prevArr, value) : null
    const queueOp = prevArr !== null && !stackOp ? detectQueueOp(prevArr, value) : null

    if (stackOp) return { type: 'stack', name, value, meta: { op: stackOp } }
    if (queueOp) return { type: 'queue', name, value, meta: { op: queueOp } }
    return { type: 'array', name, value }
  }

  // 4. Plain object
  if (value !== null && typeof value === 'object') {
    return { type: 'object', name, value }
  }

  // 5. Primitive
  return { type: 'primitive', name, value }
}

/**
 * Returns "push" | "pop" | null
 * Stack = mutations always happen at the tail (LIFO).
 */
function detectStackOp(prev, curr) {
  // push: curr is prev + one element appended at the end
  if (curr.length === prev.length + 1) {
    const isPrefixMatch = prev.every((v, i) => jsonEq(v, curr[i]))
    if (isPrefixMatch) return 'push'
  }
  // pop: prev is curr + one element at the end
  if (curr.length === prev.length - 1) {
    const isPrefixMatch = curr.every((v, i) => jsonEq(v, prev[i]))
    if (isPrefixMatch) return 'pop'
  }
  return null
}

/**
 * Returns "shift" | "enqueue" | null
 * Queue = mutations happen at the front (shift) or rear (enqueue).
 */
function detectQueueOp(prev, curr) {
  // shift: one element removed from the front
  if (curr.length === prev.length - 1) {
    const frontChanged = !jsonEq(prev[0], curr[0])
    if (frontChanged) {
      // verify the rest of curr matches prev[1..]
      const restMatch = curr.every((v, i) => jsonEq(v, prev[i + 1]))
      if (restMatch) return 'shift'
    }
  }
  // enqueue: one element appended at the rear
  if (curr.length === prev.length + 1) {
    const prevIsPrefix = prev.every((v, i) => jsonEq(v, curr[i]))
    // but the stack check already caught this pattern when element added at tail —
    // to distinguish, we rely on the queue heuristic only when a prior shift was seen
    // (i.e., the variable has already been classified as queue at least once).
    // For first occurrence we prefer "array" over misidentifying as queue.
    if (prevIsPrefix) return 'enqueue'
  }
  return null
}

// ─── Type predicates ───────────────────────────────────────────────────────

/**
 * Linked list node: { val, next } or { value, next }
 * next can be null (end of list) or another node object.
 */
function isLinkedList(node) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return false
  const keys = Object.keys(node)
  const hasVal = keys.includes('val') || keys.includes('value')
  const hasNext = keys.includes('next')
  return hasVal && hasNext
}

/**
 * Binary tree node: { val, left, right } or { value, left, right }
 */
function isTree(node) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return false
  const keys = Object.keys(node)
  const hasVal = keys.includes('val') || keys.includes('value')
  const hasLeft = keys.includes('left')
  const hasRight = keys.includes('right')
  return hasVal && hasLeft && hasRight
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function jsonEq(a, b) {
  if (a === b) return true
  try { return JSON.stringify(a) === JSON.stringify(b) } catch { return false }
}

// ─── Flow converters (used by VisualizerView) ──────────────────────────────

/**
 * Convert a linked list head node to React Flow nodes + edges.
 * Guards against circular references with a max-node limit.
 */
export function listToFlow(head) {
  const nodes = []
  const edges = []
  const MAX = 30
  let current = head
  let i = 0

  while (current && i < MAX) {
    const id = String(i)
    const label = current.val !== undefined ? String(current.val) : String(current.value)

    nodes.push({
      id,
      type: 'glassNode',
      data: { label },
      position: { x: i * 140, y: 0 },
    })

    if (current.next && typeof current.next === 'object') {
      edges.push({
        id: `e${i}-${i + 1}`,
        source: id,
        target: String(i + 1),
        label: 'next',
        type: 'smoothstep',
        markerEnd: { type: 'arrowclosed' },
        style: { strokeWidth: 1.5 },
        labelStyle: { fontSize: 10, fill: '#94a3b8' },
      })
    }

    current = current.next
    i++
  }

  // Append null sentinel node
  nodes.push({
    id: String(i),
    type: 'nullNode',
    data: { label: 'null' },
    position: { x: i * 140, y: 0 },
  })
  if (i > 0) {
    edges.push({
      id: `e${i - 1}-null`,
      source: String(i - 1),
      target: String(i),
      label: 'next',
      type: 'smoothstep',
      markerEnd: { type: 'arrowclosed' },
      style: { strokeWidth: 1.5, strokeDasharray: '4 2' },
      labelStyle: { fontSize: 10, fill: '#94a3b8' },
    })
  }

  return { nodes, edges }
}

/**
 * Convert a binary tree root node to React Flow nodes + edges.
 * Assigns each node an id before recursing so edge targets are always valid.
 */
export function treeToFlow(root) {
  const nodes = []
  const edges = []
  let idCounter = 0

  function traverse(node, x, y, spread) {
    if (!node || typeof node !== 'object') return null

    // Assign this node's id immediately
    const id = String(idCounter++)
    const label = node.val !== undefined ? String(node.val) : String(node.value)

    nodes.push({
      id,
      type: 'glassNode',
      data: { label },
      position: { x, y },
    })

    // Recurse left — child will receive the next available id (idCounter at this moment)
    if (node.left && typeof node.left === 'object') {
      const leftId = String(idCounter) // peek: this is what traverse will assign
      traverse(node.left, x - spread, y + 90, Math.max(spread / 2, 30))
      edges.push({
        id: `e${id}-L`,
        source: id,
        target: leftId,
        label: 'left',
        type: 'smoothstep',
        markerEnd: { type: 'arrowclosed' },
        style: { strokeWidth: 1.5 },
        labelStyle: { fontSize: 10, fill: '#94a3b8' },
      })
    }

    // Recurse right
    if (node.right && typeof node.right === 'object') {
      const rightId = String(idCounter) // peek again after left subtree consumed ids
      traverse(node.right, x + spread, y + 90, Math.max(spread / 2, 30))
      edges.push({
        id: `e${id}-R`,
        source: id,
        target: rightId,
        label: 'right',
        type: 'smoothstep',
        markerEnd: { type: 'arrowclosed' },
        style: { strokeWidth: 1.5 },
        labelStyle: { fontSize: 10, fill: '#94a3b8' },
      })
    }

    return id
  }

  traverse(root, 200, 20, 130)
  return { nodes, edges }
}
