/**
 * Adapter: converts JS-Interpreter internal state → plain VisualState JSON.
 *
 * VisualState = {
 *   step: number,
 *   line: number | null,
 *   variables: Record<string, any>,
 *   callStack: string[],
 * }
 *
 * Key internals confirmed from js-interpreter source:
 *   - interpreter.globalScope  → { object: { properties: {...} } }
 *   - interpreter.stateStack[] → { node, scope, done }
 *   - scope                    → { object: { properties: {...} } }
 */

// Pseudo-object type strings used by js-interpreter
const PRIMITIVE_TYPES = new Set(['number', 'string', 'boolean', 'undefined', 'null'])

// ── Stable object identity ────────────────────────────────────────────────
// We use a WeakMap keyed on the pseudo-object reference so the same
// interpreter object always gets the same __id__ across snapshots.
// This lets GraphStore identify "same node, different step".
const _objIdMap = new WeakMap()
let _objIdCounter = 0

function getStableId(pseudoObj) {
  if (!_objIdMap.has(pseudoObj)) {
    _objIdMap.set(pseudoObj, `obj_${++_objIdCounter}`)
  }
  return _objIdMap.get(pseudoObj)
}

/** Call this whenever the interpreter is reset so IDs restart cleanly. */
export function resetObjectIds() {
  _objIdCounter = 0
  // WeakMap entries are GC'd automatically — no manual clear needed.
}

/**
 * Convert a js-interpreter pseudo-value to a plain JS native value.
 * Safe against circular refs via depth limit.
 */
function pseudoToNative(value, depth = 0) {
  if (depth > 10) return '[…]'
  // Raw undefined → hoisted var, show as 'undefined' string for display
  if (value === undefined) return undefined
  if (value === null) return null

  // Primitives stored directly
  if (typeof value !== 'object') return value

  // Interpreter wraps primitives in objects with a `type` discriminant
  if (value.type === 'undefined') return undefined
  if (value.type === 'null') return null
  if (value.type === 'number') return value.data
  if (value.type === 'string') return String(value.data)
  if (value.type === 'boolean') return Boolean(value.data)

  // Object / Array pseudo-objects have a `properties` map
  if (value.properties && typeof value.properties === 'object') {
    const isArray = value.class === 'Array'
    if (isArray) {
      const len = value.properties.length?.data ?? Object.keys(value.properties).filter(k => !isNaN(k)).length
      const arr = []
      for (let i = 0; i < Math.min(len, 50); i++) {
        arr.push(pseudoToNative(value.properties[i], depth + 1))
      }
      return arr
    }
    const obj = {}
    // Embed a stable ID so GraphStore can track identity across steps
    obj.__id__ = getStableId(value)
    for (const key of Object.keys(value.properties)) {
      if (key === '__proto__') continue
      try {
        obj[key] = pseudoToNative(value.properties[key], depth + 1)
      } catch (_) { /* skip */ }
    }
    return obj
  }

  // Raw data wrapper
  if ('data' in value) return value.data

  return '[?]'
}

/**
 * Extract variables from a single scope frame.
 * Scope shape: { object: { properties: { varName: pseudoVal, ... } } }
 */
function extractScopeVars(scope) {
  const result = {}
  if (!scope) return result
  const props = scope.object?.properties ?? scope.properties ?? null
  if (!props) return result
  for (const key of Object.keys(props)) {
    if (key === 'this' || key === 'arguments' || key === '__proto__') continue
    // Skip built-ins that js-interpreter injects (window, self, etc.)
    if (key === 'window' || key === 'self' || key === 'NaN' || key === 'Infinity' || key === 'undefined') continue
    // Skip function definitions from variables panel (they clutter output)
    const val = props[key]
    if (val && (val.type === 'function' || val.class === 'Function')) continue
    try {
      result[key] = pseudoToNative(val)
    } catch (_) {
      result[key] = '<?>'
    }
  }
  return result
}

/**
 * Walk the stateStack to collect all visible variable scopes.
 * We merge from global → innermost so inner frames shadow outer.
 */
function extractVariables(interpreter) {
  const merged = {}

  // Global scope first
  if (interpreter.globalScope) {
    Object.assign(merged, extractScopeVars(interpreter.globalScope))
  }

  // Then each frame's scope (bottom to top of stateStack)
  if (Array.isArray(interpreter.stateStack)) {
    for (const state of interpreter.stateStack) {
      if (state.scope && state.scope !== interpreter.globalScope) {
        Object.assign(merged, extractScopeVars(state.scope))
      }
    }
  }

  return merged
}

/**
 * Build a human-readable call stack from stateStack nodes.
 * Walks top-down (innermost first).
 */
function extractCallStack(stateStack) {
  if (!Array.isArray(stateStack) || stateStack.length === 0) return ['(global)']

  const frames = []
  const seen = new Set()

  for (let i = stateStack.length - 1; i >= 0; i--) {
    const node = stateStack[i]?.node
    if (!node) continue

    if (node.type === 'Program') {
      if (!seen.has('(global)')) {
        frames.push('(global)')
        seen.add('(global)')
      }
      break
    }

    if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
      const name = node.id?.name ? `${node.id.name}()` : '(anonymous)()'
      if (!seen.has(name)) {
        frames.push(name)
        seen.add(name)
      }
    }

    if (node.type === 'CallExpression') {
      const callee = node.callee
      let name = '(call)'
      if (callee?.type === 'Identifier') {
        name = `${callee.name}()`
      } else if (callee?.type === 'MemberExpression') {
        const obj = callee.object?.name ?? '?'
        const prop = callee.property?.name ?? '?'
        name = `${obj}.${prop}()`
      }
      if (!seen.has(name)) {
        frames.push(name)
        seen.add(name)
      }
    }
  }

  if (frames.length === 0) frames.push('(global)')
  return frames
}

/**
 * Find the current line number from stateStack (deepest node with loc).
 */
function extractLine(stateStack) {
  if (!Array.isArray(stateStack)) return null
  for (let i = stateStack.length - 1; i >= 0; i--) {
    const node = stateStack[i]?.node
    if (node?.loc?.start?.line != null) {
      return node.loc.start.line
    }
  }
  return null
}

/**
 * Main public API: capture a VisualState snapshot from the interpreter.
 *
 * @param {object} interpreter - js-interpreter instance
 * @param {number} stepIndex   - current step counter
 * @returns {VisualState}
 */
export function capture(interpreter, stepIndex) {
  const stateStack = interpreter.stateStack ?? []
  return {
    step: stepIndex,
    line: extractLine(stateStack),
    variables: extractVariables(interpreter),
    callStack: extractCallStack(stateStack),
  }
}
