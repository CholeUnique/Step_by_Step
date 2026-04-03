import React from 'react'
import useThemeStore from '../store/themeStore.js'
import useTimelineStore from '../store/timelineStore.js'
import * as Controller from '../core/InterpreterController.js'

/**
 * Icon components (inline SVG, no deps)
 */
const IconRun = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M3 2.5l9 4.5-9 4.5V2.5z" fill="currentColor"/>
  </svg>
)
const IconPause = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="3" y="2" width="3" height="10" rx="1" fill="currentColor"/>
    <rect x="8" y="2" width="3" height="10" rx="1" fill="currentColor"/>
  </svg>
)
const IconStep = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M3 2.5l7 4.5-7 4.5V2.5z" fill="currentColor"/>
    <rect x="10" y="2" width="2" height="10" rx="1" fill="currentColor"/>
  </svg>
)
const IconReset = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2 7a5 5 0 1 0 1-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    <path d="M2 2v3h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
const IconEnd = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M3 2.5l7 4.5-7 4.5V2.5z" fill="currentColor"/>
    <rect x="11" y="2" width="2" height="10" rx="1" fill="currentColor"/>
  </svg>
)
const IconStop = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="3" y="3" width="8" height="8" rx="1.5" fill="currentColor"/>
  </svg>
)

/**
 * Toolbar status-machine rules (from README):
 *
 * | status   | Run     | Step | Reset |
 * |----------|---------|------|-------|
 * | idle     | enabled | off  | off   |
 * | running  | pause   | off  | off   |
 * | paused   | resume  | on   | on    |
 * | finished | restart | off  | on    |
 */
export default function Toolbar({ code }) {
  const { theme } = useThemeStore()
  const { status, setStatus, hardReset } = useTimelineStore()

  const isIdle = status === 'idle'
  const isRunning = status === 'running'
  const isPaused = status === 'paused'
  const isFinished = status === 'finished'

  function handleRun() {
    if (isIdle) {
      // Start fresh
      Controller.init(code)
      setStatus('running')
      Controller.runAll()
    } else if (isRunning) {
      // Pause
      Controller.pause()
      setStatus('paused')
    } else if (isPaused) {
      // Resume
      setStatus('running')
      Controller.runAll()
    } else if (isFinished) {
      // Restart
      Controller.reset()
      hardReset()
    }
  }

  function handleStep() {
    if (!isPaused) return
    // If we haven't initialized yet but are paused (step-mode), step once
    Controller.step()
  }

  function handleStepInto() {
    if (!isPaused) return
    // First step — initialize if needed
    Controller.step()
  }

  function handleRunToEnd() {
    if (!isPaused) return
    setStatus('running')
    Controller.runAll()
  }

  function handleReset() {
    Controller.pause()
    Controller.reset()
    hardReset()
  }

  function handleStop() {
    Controller.pause()
    if (!isIdle) setStatus('finished')
  }

  // Special "init + pause at step 0" for step-debugging
  function handleStepInit() {
    if (isIdle) {
      Controller.init(code)
      setStatus('paused')
    } else if (isPaused) {
      Controller.step()
    }
  }

  const runLabel = isRunning ? 'Pause' : isPaused ? 'Resume' : isFinished ? 'Restart' : 'Run'
  const RunIcon = isRunning ? IconPause : IconRun

  // Run button color: red when idle/finished, green when running/paused
  const runBtnClass = (isIdle || isFinished) ? theme.runBtn : theme.runBtnActive

  return (
    <div className={`
      flex items-center gap-1.5 px-3 py-2 shrink-0
      ${theme.sidebarBg} rounded-2xl mx-3 mt-3
    `}>
      {/* Run / Pause / Resume / Restart */}
      <button
        onClick={handleRun}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
          transition-all duration-150 active:scale-95 select-none
          ${runBtnClass}
        `}
        title={runLabel}
      >
        <RunIcon />
        <span>{runLabel}</span>
      </button>

      <div className={`w-px h-5 mx-0.5 ${theme.divider}`} />

      {/* Step Into (doubles as "start step mode" when idle) */}
      <ToolBtn
        onClick={handleStepInit}
        disabled={isRunning || isFinished}
        icon={<IconStep />}
        label="Step"
        theme={theme}
        title={isIdle ? 'Init & Step' : 'Step Into'}
      />

      {/* Step Over — toast only */}
      <ToolBtn
        onClick={() => toast('Step Over — coming soon')}
        disabled={!isPaused}
        icon={
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 3.5l5 3.5-5 3.5V3.5z" fill="currentColor"/>
            <path d="M10 2c1.5.8 2 2.2 2 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <rect x="10" y="7" width="2" height="5" rx="1" fill="currentColor"/>
          </svg>
        }
        label="Over"
        theme={theme}
        title="Step Over (coming soon)"
      />

      {/* Step Out — toast only */}
      <ToolBtn
        onClick={() => toast('Step Out — coming soon')}
        disabled={!isPaused}
        icon={
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 11L9 7 5 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="10" y="3" width="2" height="8" rx="1" fill="currentColor"/>
          </svg>
        }
        label="Out"
        theme={theme}
        title="Step Out (coming soon)"
      />

      {/* Run to End */}
      <ToolBtn
        onClick={handleRunToEnd}
        disabled={!isPaused}
        icon={<IconEnd />}
        label="End"
        theme={theme}
        title="Run to End"
      />

      <div className={`w-px h-5 mx-0.5 ${theme.divider}`} />

      {/* Reset */}
      <ToolBtn
        onClick={handleReset}
        disabled={isIdle}
        icon={<IconReset />}
        label="Reset"
        theme={theme}
        title="Reset"
      />

      {/* Stop */}
      <ToolBtn
        onClick={handleStop}
        disabled={isIdle || isFinished}
        icon={<IconStop />}
        label="Stop"
        theme={theme}
        title="Stop execution"
      />

      {/* Status pill */}
      <div className="ml-auto">
        <StatusPill status={status} theme={theme} />
      </div>
    </div>
  )
}

function ToolBtn({ onClick, disabled, icon, label, theme, title }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={title}
      className={`
        flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium
        transition-all duration-150 active:scale-95 select-none
        ${disabled ? theme.btnDisabled : theme.btnBase}
      `}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

function StatusPill({ status, theme }) {
  const map = {
    idle:     { dot: 'bg-gray-400', label: 'Idle' },
    running:  { dot: 'bg-green-400 animate-pulse', label: 'Running' },
    paused:   { dot: 'bg-yellow-400', label: 'Paused' },
    finished: { dot: 'bg-blue-400', label: 'Done' },
  }
  const s = map[status] || map.idle
  return (
    <span className={`
      flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
      ${theme.tag} transition-all duration-300
    `}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

function toast(msg) {
  // Simple ephemeral toast via a transient div
  const el = document.createElement('div')
  el.textContent = msg
  el.style.cssText = `
    position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
    background:rgba(0,0,0,0.85); color:white; padding:8px 18px;
    border-radius:999px; font-size:13px; z-index:9999;
    backdrop-filter:blur(12px); pointer-events:none;
    transition:opacity 0.3s;
  `
  document.body.appendChild(el)
  setTimeout(() => { el.style.opacity = '0' }, 1800)
  setTimeout(() => el.remove(), 2200)
}
