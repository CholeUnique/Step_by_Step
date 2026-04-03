/**
 * VisualizerAdapter
 *
 * Converts raw `variables` from a timeline snapshot into structured
 * semantic data for the VisualizerView to render.
 *
 * Rules (in priority order):
 *  - Array + name includes "stack"  → type: "stack"
 *  - Array + name includes "queue"  → type: "queue"
 *  - Array                          → type: "array"
 *  - object (non-null, non-array)
 *      + has val/value + left + right → type: "tree"   (future)
 *      + has val/value + next         → type: "linkedlist" (future)
 *      + otherwise                   → type: "object"
 *  - primitive                      → type: "primitive"
 *
 * Input:  visualState  — a timeline snapshot ({ variables, line, step, callStack })
 * Output: { structures: Array<StructureItem> }
 *
 * StructureItem shape:
 *   { type: string, name: string, value: any }
 */

/**
 * @param {{ variables: Object }} visualState
 * @returns {{ structures: Array<{type:string, name:string, value:any}> }}
 */
export function buildVisualizerState(visualState) {
  const vars = visualState?.variables ?? {}

  const structures = Object.entries(vars).map(([name, value]) => {
    return { type: detectType(name, value), name, value }
  })

  return { structures }
}

/**
 * Determine the semantic type of a variable.
 * @param {string} name
 * @param {*} value
 * @returns {string}
 */
function detectType(name, value) {
  if (Array.isArray(value)) {
    const lc = name.toLowerCase()
    if (lc.includes('stack')) return 'stack'
    if (lc.includes('queue')) return 'queue'
    return 'array'
  }

  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value)
    const hasVal = keys.includes('val') || keys.includes('value')
    if (hasVal && keys.includes('left') && keys.includes('right')) return 'tree'
    if (hasVal && keys.includes('next')) return 'linkedlist'
    return 'object'
  }

  return 'primitive'
}
