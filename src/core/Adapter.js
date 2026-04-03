/**
 * Adapter: converts JS-Interpreter internal state → plain VisualState JSON.
 *
 * VisualState = {
 *   step: number,
 *   line: number | null,
 *   variables: Record<string, any>,
 *   callStack: string[],
 * }
 */

/**
 * Safely converts a JS-Interpreter pseudo-value to a plain JS native value.
 * We do NOT call interpreter.pseudoToNative because it can throw on circular refs.
 */
function pseudoToNative(value, depth = 0) {
  if (depth > 4) return '[...]'
  if (value === null || value === undefined) return null
  if (typeof value !== 'object') return value

  // Primitive wrapper
  if (value.type === 'number' || value.type === 'string' || value.type === 'boolean') {
    return value.data
  }
  if (value.type === 'undefined') return undefined
  if (value.type === 'null') return null

  // JS-Interpreter Object / Array
  if (value.properties) {
    const isArray = value.class === 'Array'
    const result = isArray ? [] : {}
    for (const key of Object.keys(value.properties)) {
      if (key === '__proto__') continue
      try {
        const v = value.properties[key]
        if (isArray && !isNaN(Number(key))) {
          result[Number(key)] = pseudoToNative(v, depth + 1)
        } else {
          result[key] = pseudoToNative(v, depth + 1)
        }
      } catch (_) {
        // skip unreadable props
      }
    }
    return result
  }

  // Plain value wrapper (data field)
  if ('data' in value) return value.data

  return String(value)
}

/**
 * Extract variables from a scope object.
 */
function extractScope(scope) {
  if (!scope || !scope.object || !scope.object.properties) return {}
  const vars = {}
  for (const key of Object.keys(scope.object.properties)) {
    if (key === 'this' || key === 'arguments') continue
    try {
      const raw = scope.object.properties[key]
      vars[key] = pseudoToNative(raw)
    } catch (_) {
      vars[key] = '<?>'
    }
  }
  return vars
}

/**
 * Extract the call stack from interpreter.stateStack.
 * Each entry in stateStack has a `node` (AST node).
 */
function extractCallStack(stateStack) {
  if (!stateStack || !Array.isArray(stateStack)) return ['(global)']
  const frames = []
  for (let i = stateStack.length - 1; i >= 0; i--) {
    const state = stateStack[i]
    const node = state.node
    if (!node) continue
    if (node.type === 'Program') {
      frames.push('(global)')
      break
    }
    if (node.type === 'CallExpression') {
      const callee = node.callee
      if (callee) {
        if (callee.type === 'Identifier') {
          frames.push(callee.name + '()')
        } else if (callee.type === 'MemberExpression') {
          const obj = callee.object && callee.object.name ? callee.object.name : '?'
          const prop = callee.property && callee.property.name ? callee.property.name : '?'
          frames.push(`${obj}.${prop}()`)
        } else {
          frames.push('(anonymous)()')
        }
      }
    }
    if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
      const name = (node.id && node.id.name) ? node.id.name + '()' : '(fn)()'
      if (!frames.includes(name)) frames.push(name)
    }
  }
  if (frames.length === 0) frames.push('(global)')
  return frames
}

/**
 * Get current executing line from stateStack.
 */
function extractLine(stateStack) {
  if (!stateStack || !Array.isArray(stateStack)) return null
  for (let i = stateStack.length - 1; i >= 0; i--) {
    const node = stateStack[i] && stateStack[i].node
    if (node && node.loc && node.loc.start) {
      return node.loc.start.line
    }
  }
  return null
}

/**
 * Extract all variables visible in the current scope chain.
 */
function extractVariables(interpreter) {
  const allVars = {}

  // Walk scope chain bottom-up (global first, then local frames)
  const scopes = []
  let scope = interpreter.getScope ? interpreter.getScope() : null

  // Also try globalScope
  if (interpreter.globalScope) {
    scopes.push(interpreter.globalScope)
  }

  // Current scope from stateStack
  if (interpreter.stateStack && Array.isArray(interpreter.stateStack)) {
    for (const state of interpreter.stateStack) {
      if (state.scope) scopes.push(state.scope)
    }
  }

  for (const s of scopes) {
    Object.assign(allVars, extractScope(s))
  }

  return allVars
}

/**
 * Main capture function — the only public API.
 */
export function capture(interpreter, stepIndex) {
  const stateStack = interpreter.stateStack || []
  const line = extractLine(stateStack)
  const variables = extractVariables(interpreter)
  const callStack = extractCallStack(stateStack)

  return {
    step: stepIndex,
    line,
    variables,
    callStack,
  }
}
