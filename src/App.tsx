import { useRef, useState, useCallback, useEffect } from 'react'
import { Sidebar } from './components/sidebar/Sidebar'
import { StartScreen } from './components/start/StartScreen'
import { QuickStartModal } from './components/start/QuickStartModal'
import { TerminalPanel } from './components/terminal/TerminalPanel'
import { EditorPanel } from './components/editor/EditorPanel'
import { BrowserPanel } from './components/browser/BrowserPanel'
import { SettingsNav } from './components/settings/SettingsNav'
import { SettingsContent } from './components/settings/SettingsContent'
import { useProjectStore, useActiveProject } from './stores/project-store'
import { useSettingsStore } from './stores/settings-store'
import { useBrowserStore } from './stores/browser-store'
import { useModalStore } from './stores/modal-store'
import { getPaletteRgb, getPaletteHex } from './lib/palettes'

// Panel widths stored as percentages so they scale correctly when the user zooms
const SIDEBAR_MIN = 14   // %
const SIDEBAR_MAX = 35   // %
const TERMINAL_MIN = 18  // %
const TERMINAL_MAX = 48  // %

function usePanelResize(initialPct: number, minPct: number, maxPct: number, direction: 'right' | 'left') {
  const [pct, setPct] = useState(initialPct)
  const dragging = useRef(false)
  const startX = useRef(0)
  const startPct = useRef(0)

  const reset = useCallback(() => setPct(initialPct), [initialPct])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true
    startX.current = e.clientX
    startPct.current = pct
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [pct])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const deltaPct = ((e.clientX - startX.current) / window.innerWidth) * 100
      const next = direction === 'right'
        ? startPct.current + deltaPct
        : startPct.current - deltaPct
      setPct(Math.min(maxPct, Math.max(minPct, next)))
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
  }, [minPct, maxPct, direction])

  return { pct, onMouseDown, reset }
}

// Apply color mode class to <html> and set accent CSS variable
function useTheme() {
  const colorMode = useSettingsStore((s) => s.colorMode)
  const activeProject = useActiveProject()

  // Apply color mode
  useEffect(() => {
    const html = document.documentElement
    const mq = window.matchMedia('(prefers-color-scheme: dark)')

    const apply = () => {
      const isDark =
        colorMode === 'dark' ||
        (colorMode === 'native' && mq.matches)

      // Animate the transition
      html.classList.add('theme-transition')
      html.classList.toggle('dark', isDark)
      html.classList.toggle('light', !isDark)
      setTimeout(() => html.classList.remove('theme-transition'), 160)

      // Sync macOS window chrome (border, shadow) and backgroundColor with app theme
      const source = colorMode === 'native' ? 'system' : colorMode
      const bgColor = isDark ? '#09090b' : '#fafafa'
      window.electron.setWindowTheme(source, bgColor)
    }

    apply()

    if (colorMode === 'native') {
      mq.addEventListener('change', apply)
      return () => mq.removeEventListener('change', apply)
    }
  }, [colorMode])

  // Apply accent from active project palette
  useEffect(() => {
    const hex = activeProject ? getPaletteHex(activeProject.palette) : '#71717a'
    const rgb = activeProject ? getPaletteRgb(activeProject.palette) : '113 113 122'
    document.documentElement.style.setProperty('--accent-hex', hex)
    document.documentElement.style.setProperty('--accent', rgb)
  }, [activeProject?.palette])
}

export default function App() {
  useTheme()

  const { projects } = useProjectStore()
  const { isOpen: isSettingsOpen } = useSettingsStore()
  const activeProject = useActiveProject()
  const browserVisible = useBrowserStore((s) => s.visible[activeProject?.id ?? ''] ?? false)
  const quickStartOpen = useModalStore((s) => s.quickStartOpen)
  const hasProjects = projects.length > 0
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const sidebar = usePanelResize(22, SIDEBAR_MIN, SIDEBAR_MAX, 'right')
  const terminal = usePanelResize(39, TERMINAL_MIN, TERMINAL_MAX, 'left')

  return (
    <div className="flex flex-col h-full bg-base text-t1">
      {quickStartOpen && <QuickStartModal />}
      <div className="flex flex-1 min-h-0">
        {isSettingsOpen ? (
          <>
            {/* Settings nav uses the same width as the main sidebar */}
            <div style={{ width: `${sidebar.pct}%` }} className="shrink-0 h-full">
              <SettingsNav />
            </div>
            <SettingsContent />
          </>
        ) : (
          <>
            {/* Sidebar — always visible */}
            <div
              style={sidebarCollapsed ? { width: 0, minWidth: 0, overflow: 'hidden' } : { width: `${sidebar.pct}%` }}
              className="shrink-0 transition-none"
            >
              <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(v => !v)} />
            </div>

            {/* Sidebar resize handle */}
            {!sidebarCollapsed && (
              <div
                onMouseDown={sidebar.onMouseDown}
                onDoubleClick={sidebar.reset}
                className="w-0.5 shrink-0 cursor-col-resize hover:bg-overlay active:bg-overlay transition-colors bg-edge"
              />
            )}

            {/* Expand button shown when sidebar is collapsed */}
            {sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="no-drag fixed top-1.5 left-16 z-[100] flex items-center justify-center w-7 h-7 text-zinc-400 hover:text-zinc-200 hover:bg-white/10 rounded transition-colors"
                title="Show sidebar"
              >
                <SidebarIcon />
              </button>
            )}

            {hasProjects ? (
              <>
                {/* Center — editor / browser */}
                <div className="flex-1 min-w-0 min-h-0 flex flex-col relative">
                  <div className={browserVisible ? 'hidden' : 'flex flex-col flex-1 min-h-0'}>
                    <EditorPanel />
                  </div>
                  {browserVisible && activeProject && (
                    <BrowserPanel projectId={activeProject.id} />
                  )}
                </div>

                {/* Terminal resize handle */}
                <div
                  onMouseDown={terminal.onMouseDown}
                  onDoubleClick={terminal.reset}
                  className="w-0.5 shrink-0 cursor-col-resize hover:bg-overlay active:bg-overlay transition-colors bg-edge"
                />

                {/* Terminal */}
                <div style={{ width: `${terminal.pct}%` }} className="shrink-0">
                  <TerminalPanel />
                </div>
              </>
            ) : (
              /* No projects — welcome screen fills remaining space */
              <StartScreen />
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Inline SVG matching SidebarSimple from Phosphor
function SidebarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor">
      <path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40ZM40,56H88V200H40ZM216,200H104V56H216V200Z" />
    </svg>
  )
}
