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
  _interpreter = new Interpreter(code, initFunc)
  _stepCount = 0
  _running = false

  // Capture initial state (step 0)
  const snap = capture(_interpreter, _stepCount)
  _storeApi.getState().resetTimeline([snap])
}

export function step() {
  if (!_interpreter) return false
  if (_stepCount >= MAX_STEPS) {
    _storeApi.getState().setStatus('finished')
    return false
  }

  let hasMore = false
  try {
    hasMore = _interpreter.step()
  } catch (err) {
    console.error('[InterpreterController] step error:', err)
    _storeApi.getState().setStatus('finished')
    return false
  }

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
