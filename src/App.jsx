import React, { useState, useEffect } from 'react'
import { Allotment } from 'allotment'
import Header from './components/Header.jsx'
import Toolbar from './components/Toolbar.jsx'
import CodeEditor from './components/CodeEditor.jsx'
import Visualizer from './components/Visualizer.jsx'
import WatchPanel from './components/WatchPanel.jsx'
import useThemeStore from './store/themeStore.js'
import useTimelineStore from './store/timelineStore.js'
import { injectStore } from './core/InterpreterController.js'

// Inject the store into the controller once at startup
injectStore(useTimelineStore)

const DEFAULT_CODE = `function add(a, b) {
  return a + b;
}

let x = add(1, 2);
let y = add(x, 10);
console.log(y);
`

export default function App() {
  const { theme } = useThemeStore()
  const [code, setCode] = useState(DEFAULT_CODE)

  return (
    <div className={`flex flex-col h-screen ${theme.bg} transition-colors duration-300`}>
      <Header />

      {/* Main split area */}
      <div className="flex-1 min-h-0 p-2 pt-2">
        <Allotment defaultSizes={[50, 50]} separator>
          {/* LEFT: Toolbar + Monaco */}
          <Allotment.Pane minSize={280}>
            <div className={`
              flex flex-col h-full rounded-2xl overflow-hidden
              ${theme.panelBg}
            `}>
              <Toolbar code={code} />
              <CodeEditor code={code} onChange={setCode} />
            </div>
          </Allotment.Pane>

          {/* RIGHT: Visualizer (top) + WatchPanel (bottom) */}
          <Allotment.Pane minSize={260}>
            <div className="flex flex-col h-full gap-2">
              <Allotment vertical defaultSizes={[55, 45]} separator>
                {/* Top: Visualizer */}
                <Allotment.Pane minSize={120}>
                  <div className="h-full p-0.5 pr-0.5 pb-0">
                    <Visualizer />
                  </div>
                </Allotment.Pane>

                {/* Bottom: Watch Panel */}
                <Allotment.Pane minSize={100}>
                  <div className="h-full p-0.5 pt-0">
                    <WatchPanel />
                  </div>
                </Allotment.Pane>
              </Allotment>
            </div>
          </Allotment.Pane>
        </Allotment>
      </div>
    </div>
  )
}
