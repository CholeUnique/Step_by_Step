/**
 * InterpreterController
 *
 * Wraps js-interpreter and drives the execution loop.
 * Calls Adapter.capture() after each step and pushes to TimelineStore.
 *
 * Public API:
 *   init(code)  — load new code, reset everything
 *   step()      — execute one step, returns true if more steps remain
 *   runAll()    — run until done or MAX_STEPS
 *   reset()     — tear down interpreter
 */

import Interpreter from 'js-interpreter'
import { capture } from './Adapter.js'
import { transformCode } from './codeTransformer.js'

const MAX_STEPS = 1000

// Store ref is injected at runtime to avoid circular imports
let _storeApi = null

export function injectStore(storeApi) {
  _storeApi = storeApi
}

let _interpreter = null
let _stepCount = 0
let _running = false

/** Build initFunc to expose console.log to the interpreter sandbox */
function initFunc(interpreter, globalObject) {
  const consoleObj = interpreter.nativeToPseudo({})
  interpreter.setProperty(
    globalObject,
    'console',
    consoleObj
  )
  interpreter.setProperty(
    consoleObj,
    'log',
    interpreter.createNativeFunction((...args) => {
      // eslint-disable-next-line no-console
      console.log('[sandbox]', ...args.map(a => {
        try { return interpreter.pseudoToNative(a) } catch { return String(a) }
      }))
    })
  )
}

export function init(code) {
  const transformed = transformCode(code)
  _interpreter = new Interpreter(transformed, initFunc)
  _stepCount = 0
  _running = false

  // Capture initial state (step 0)
  const snap = capture(_interpreter, _stepCount)
  _storeApi.getState().resetTimeline([snap])
}

/** Return the source line of the top-most stateStack entry that has loc info. */
function getCurrentLine(interp) {
  const stack = interp.stateStack
  if (!Array.isArray(stack)) return null
  for (let i = stack.length - 1; i >= 0; i--) {
    const line = stack[i]?.node?.loc?.start?.line
    if (line != null) return line
  }
  return null
}

/**
 * Advance the interpreter until the source line changes (or execution ends).
 * Returns { hasMore, changed } so callers know whether to push a snapshot.
 *
 * We cap the inner loop at MAX_AST_STEPS to avoid an infinite loop on
 * programs that never change line (e.g. a single-expression program).
 */
const MAX_AST_STEPS = 2000

function stepToNextLine() {
  const startLine = getCurrentLine(_interpreter)
  let hasMore = true
  let innerSteps = 0

  try {
    while (innerSteps < MAX_AST_STEPS) {
      hasMore = _interpreter.step()
      innerSteps++
      if (!hasMore) break
      const newLine = getCurrentLine(_interpreter)
      if (newLine !== startLine && newLine != null) break
    }
  } catch (err) {
    console.error('[InterpreterController] step error:', err)
    _storeApi.getState().setStatus('finished')
    return false
  }

  return hasMore
}

export function step() {
  if (!_interpreter) return false
  if (_stepCount >= MAX_STEPS) {
    _storeApi.getState().setStatus('finished')
    return false
  }

  const hasMore = stepToNextLine()

  _stepCount++
  const snap = capture(_interpreter, _stepCount)
  _storeApi.getState().pushSnapshot(snap)

  if (!hasMore) {
    _storeApi.getState().setStatus('finished')
  }

  return hasMore
}

export function runAll() {
  if (!_interpreter) return
  _running = true

  // Use requestAnimationFrame to keep UI responsive for small programs,
  // and fall back to synchronous loop for large ones.
  const BATCH = 50
  let count = 0

  const tick = () => {
    if (!_running) return
    for (let i = 0; i < BATCH; i++) {
      if (!step()) {
        _running = false
        return
      }
      count++
      if (count >= MAX_STEPS) {
        _running = false
        _storeApi.getState().setStatus('finished')
        return
      }
    }
    requestAnimationFrame(tick)
  }

  requestAnimationFrame(tick)
}

export function pause() {
  _running = false
}

export function reset() {
  _interpreter = null
  _stepCount = 0
  _running = false
}
