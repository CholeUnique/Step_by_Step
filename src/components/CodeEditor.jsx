import React, { useRef, useEffect } from 'react'
import MonacoEditor from '@monaco-editor/react'
import useThemeStore from '../store/themeStore.js'
import useTimelineStore from '../store/timelineStore.js'

const DEFAULT_CODE = `function add(a, b) {
  return a + b;
}

let x = add(1, 2);
let y = add(x, 10);
console.log(y);
`

export default function CodeEditor({ code, onChange }) {
  const { theme } = useThemeStore()
  const { timeline, currentStep } = useTimelineStore()
  const editorRef = useRef(null)
  const decorationsRef = useRef([])

  // Highlight current executing line
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    const snap = timeline[currentStep]
    const line = snap?.line

    decorationsRef.current = editor.deltaDecorations(
      decorationsRef.current,
      line
        ? [{
            range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
            options: {
              isWholeLine: true,
              className: 'current-line-highlight',
              glyphMarginClassName: 'current-line-glyph',
            },
          }]
        : []
    )
  }, [currentStep, timeline])

  function handleEditorDidMount(editor) {
    editorRef.current = editor

    // Inject highlight style
    const style = document.createElement('style')
    style.innerHTML = `
      .current-line-highlight {
        background: rgba(255, 200, 0, 0.18) !important;
        border-left: 3px solid #f59e0b !important;
      }
      .current-line-glyph::before {
        content: '▶';
        color: #f59e0b;
        font-size: 10px;
        margin-left: 2px;
      }
    `
    document.head.appendChild(style)
  }

  return (
    <div className="flex-1 min-h-0 overflow-hidden rounded-2xl mx-3 mb-3">
      <MonacoEditor
        height="100%"
        language="javascript"
        theme={theme.monacoTheme}
        value={code}
        onChange={val => onChange(val ?? '')}
        onMount={handleEditorDidMount}
        options={{
          fontSize: 14,
          fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", Menlo, monospace',
          fontLigatures: true,
          lineNumbers: 'on',
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          roundedSelection: true,
          padding: { top: 14, bottom: 14 },
          tabSize: 2,
          insertSpaces: true,
          autoIndent: 'full',
          formatOnPaste: true,
          wordWrap: 'on',
          renderLineHighlight: 'none', // we do our own
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          glyphMargin: true,
        }}
      />
    </div>
  )
}
