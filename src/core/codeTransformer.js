/**
 * codeTransformer
 *
 * Transpiles user-written ES6+ code to ES5 using @babel/standalone,
 * so that js-interpreter (which only understands ES5) can execute it.
 *
 * Supported ES6 features (via @babel/preset-env / es2015):
 *   - Arrow functions
 *   - let / const
 *   - Default parameters
 *   - Template literals
 *   - Destructuring
 *   - Spread / rest
 *   - Classes
 *
 * If Babel fails (syntax error in user code), the original code is
 * returned unchanged so js-interpreter can surface the error directly.
 */
import * as Babel from '@babel/standalone'

/**
 * @param {string} code  Raw user source (ES6+)
 * @returns {string}     Transpiled ES5 code, or original on Babel error
 */
export function transformCode(code) {
  try {
    const result = Babel.transform(code, {
      presets: ['es2015'],
      // Don't emit source maps — js-interpreter doesn't use them
      sourceMaps: false,
      // Keep line numbers as close as possible
      retainLines: true,
    })
    return result.code
  } catch (e) {
    // Babel parse / transform error → return original so downstream can report it
    console.warn('[codeTransformer] Babel error, using original code:', e.message)
    return code
  }
}
