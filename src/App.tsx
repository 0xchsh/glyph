import { useRef, useState, useCallback, useEffect } from 'react'
import { Sidebar } from './components/sidebar/Sidebar'
import { StartScreen } from './components/start/StartScreen'
import { TerminalPanel } from './components/terminal/TerminalPanel'
import { EditorPanel } from './components/editor/EditorPanel'
import { SettingsNav } from './components/settings/SettingsNav'
import { SettingsContent } from './components/settings/SettingsContent'
import { useProjectStore } from './stores/project-store'
import { useSettingsStore } from './stores/settings-store'

const SIDEBAR_MIN = 320
const SIDEBAR_MAX = 400
const TERMINAL_MIN = 280
const TERMINAL_MAX = 700

function usePanelResize(initial: number, min: number, max: number, direction: 'right' | 'left') {
  const [width, setWidth] = useState(initial)
  const dragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true
    startX.current = e.clientX
    startWidth.current = width
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [width])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const delta = direction === 'right'
        ? e.clientX - startX.current
        : startX.current - e.clientX
      setWidth(Math.min(max, Math.max(min, startWidth.current + delta)))
    }
    const onMouseUp = () => {
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [min, max, direction])

  return { width, onMouseDown }
}

export default function App() {
  const { projects } = useProjectStore()
  const { isOpen: isSettingsOpen } = useSettingsStore()
  const hasProjects = projects.length > 0

  const sidebar = usePanelResize(320, SIDEBAR_MIN, SIDEBAR_MAX, 'right')
  const terminal = usePanelResize(420, TERMINAL_MIN, TERMINAL_MAX, 'left')

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-50">
      <div className="flex flex-1 min-h-0">
        {hasProjects ? (
          <>
            {isSettingsOpen ? (
              <>
                <SettingsNav />
                <SettingsContent />
              </>
            ) : (
              <>
                <div style={{ width: sidebar.width, minWidth: sidebar.width }} className="shrink-0">
                  <Sidebar />
                </div>

                {/* Sidebar resize handle */}
                <div
                  onMouseDown={sidebar.onMouseDown}
                  className="w-1 shrink-0 cursor-col-resize hover:bg-zinc-600 active:bg-zinc-500 transition-colors bg-zinc-800"
                />

                {/* Center — editor / browser — grows to fill remaining space */}
                <div className="flex-1 min-w-0 min-h-0 flex flex-col">
                  <EditorPanel />
                </div>

                {/* Terminal resize handle */}
                <div
                  onMouseDown={terminal.onMouseDown}
                  className="w-1 shrink-0 cursor-col-resize hover:bg-zinc-600 active:bg-zinc-500 transition-colors bg-zinc-800"
                />
              </>
            )}
            {/* Right — terminal column — hidden in settings */}
            {!isSettingsOpen && (
              <div style={{ width: terminal.width, minWidth: terminal.width }} className="shrink-0 border-l border-zinc-800">
                <TerminalPanel />
              </div>
            )}
          </>
        ) : (
          <StartScreen />
        )}
      </div>
    </div>
  )
}
