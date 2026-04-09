import { useEffect } from 'react'
import { StartScreen } from './components/start/StartScreen'
import { QuickStartModal } from './components/start/QuickStartModal'
import { CloneModal } from './components/start/CloneModal'
import { TerminalPanel } from './components/terminal/TerminalPanel'
import { BrowserPanel } from './components/browser/BrowserPanel'
import { ProjectsSidebar } from './components/sidebar/ProjectsSidebar'
import { FileExplorer } from './components/sidebar/FileExplorer'
import { SettingsNav } from './components/settings/SettingsNav'
import { SettingsContent } from './components/settings/SettingsContent'
import { useProjectStore, useActiveProject } from './stores/project-store'
import { useSettingsStore } from './stores/settings-store'
import { useBrowserStore } from './stores/browser-store'
import { useModalStore } from './stores/modal-store'
import { usePanelResize } from './lib/use-panel-resize'
import { getPaletteRgb, getPaletteHex } from './lib/palettes'

// Panel size constraints (percentages)
const PROJECTS_COL_MIN = 10
const PROJECTS_COL_MAX = 25
const FILES_COL_MIN = 10
const FILES_COL_MAX = 30
const BROWSER_H_MIN = 25   // height, horizontal layout
const BROWSER_H_MAX = 80
const BROWSER_V_MIN = 25   // width, vertical layout
const BROWSER_V_MAX = 70

// Apply color mode class to <html> and set accent CSS variable
function useTheme() {
  const colorMode = useSettingsStore((s) => s.colorMode)
  const activeProject = useActiveProject()

  useEffect(() => {
    const html = document.documentElement
    const mq = window.matchMedia('(prefers-color-scheme: dark)')

    const apply = () => {
      const isDark =
        colorMode === 'dark' ||
        (colorMode === 'native' && mq.matches)

      html.classList.add('theme-transition')
      html.classList.toggle('dark', isDark)
      html.classList.toggle('light', !isDark)
      setTimeout(() => html.classList.remove('theme-transition'), 160)

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

  useEffect(() => {
    const hex = activeProject ? getPaletteHex(activeProject.palette) : '#71717a'
    const rgb = activeProject ? getPaletteRgb(activeProject.palette) : '113 113 122'
    document.documentElement.style.setProperty('--accent-hex', hex)
    document.documentElement.style.setProperty('--accent', rgb)
  }, [activeProject?.palette])
}

function usePortDetection() {
  const setDetectedPort = useProjectStore((s) => s.setDetectedPort)
  const clearDetectedPort = useProjectStore((s) => s.clearDetectedPort)

  useEffect(() => {
    if (!window.electron.onPortDetected) return
    const offDetected = window.electron.onPortDetected((projectId, port) => {
      setDetectedPort(projectId, port)
    })
    const offCleared = window.electron.onPortCleared((projectId) => {
      clearDetectedPort(projectId)
    })
    return () => { offDetected(); offCleared() }
  }, [setDetectedPort, clearDetectedPort])
}

export default function App() {
  useTheme()
  usePortDetection()

  const { projects } = useProjectStore()
  const { isOpen: isSettingsOpen } = useSettingsStore()
  const activeProject = useActiveProject()
  const activeLayout = activeProject?.layout ?? 'vertical'
  const quickStartOpen = useModalStore((s) => s.quickStartOpen)
  const cloneOpen = useModalStore((s) => s.cloneOpen)
  const hasProjects = projects.length > 0
  const sidebarCollapsed = useProjectStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useProjectStore((s) => s.toggleSidebar)
  const isFullscreen = useBrowserStore((s) => s.fullscreen[activeProject?.id ?? ''] ?? false)

  // Resize hooks
  const projectsCol = usePanelResize(16, PROJECTS_COL_MIN, PROJECTS_COL_MAX, 'right')
  const filesCol = usePanelResize(16, FILES_COL_MIN, FILES_COL_MAX, 'left')
  const browserH = usePanelResize(60, BROWSER_H_MIN, BROWSER_H_MAX, 'down')   // browser height (horizontal)
  const browserV = usePanelResize(50, BROWSER_V_MIN, BROWSER_V_MAX, 'left')    // browser width (vertical)

  return (
    <div className="flex flex-col h-full bg-base text-t1">
      {quickStartOpen && <QuickStartModal />}
      {cloneOpen && <CloneModal />}
      <div className="flex flex-1 min-h-0">
        {isSettingsOpen ? (
          <>
            <div style={{ width: `${projectsCol.pct}%` }} className="shrink-0 h-full">
              <SettingsNav />
            </div>
            <SettingsContent />
          </>
        ) : hasProjects ? (
          activeLayout === 'horizontal' ? (
            <HorizontalLayout
              activeProject={activeProject}
              sidebarCollapsed={sidebarCollapsed}
              toggleSidebar={toggleSidebar}
              isFullscreen={isFullscreen}
              projectsCol={projectsCol}
              filesCol={filesCol}
              browserH={browserH}
            />
          ) : (
            <VerticalLayout
              activeProject={activeProject}
              sidebarCollapsed={sidebarCollapsed}
              toggleSidebar={toggleSidebar}
              isFullscreen={isFullscreen}
              projectsCol={projectsCol}
              browserV={browserV}
            />
          )
        ) : (
          <StartScreen />
        )}
      </div>
    </div>
  )
}

// ── Horizontal layout — browser on top, technical panel on bottom ─────────────

interface HorizontalProps {
  activeProject: ReturnType<typeof useActiveProject>
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  isFullscreen: boolean
  projectsCol: ReturnType<typeof usePanelResize>
  filesCol: ReturnType<typeof usePanelResize>
  browserH: ReturnType<typeof usePanelResize>
}

function HorizontalLayout({ activeProject, sidebarCollapsed, toggleSidebar, isFullscreen, projectsCol, filesCol, browserH }: HorizontalProps) {
  return (
    <div className="flex-1 min-w-0 min-h-0 flex flex-col">
      {/* Top — Visual panel (browser or canvas) */}
      <div
        className="flex flex-col min-h-0"
        style={isFullscreen ? { flex: 1 } : { height: `${browserH.pct}%` }}
      >
        {activeProject && (
          <BrowserPanel projectId={activeProject.id} defaultUrl={`http://localhost:${activeProject.port}`} layout="horizontal" />
        )}
      </div>

      {!isFullscreen && (
        <>
          {/* Horizontal resize handle */}
          <div
            onMouseDown={browserH.onMouseDown}
            onDoubleClick={browserH.reset}
            className="shrink-0 cursor-row-resize group flex flex-col items-center z-10"
            style={{ height: 7, marginTop: -3, marginBottom: -3 }}
          >
            <div className="h-px w-full bg-edge/0 group-hover:bg-edge transition-colors" />
          </div>

          {/* Bottom — Technical panel (3 columns) */}
          <div className="flex-1 min-h-0 flex">
            {/* Projects column */}
            {!sidebarCollapsed && (
              <>
                <div style={{ width: `${projectsCol.pct}%` }} className="shrink-0 h-full">
                  <ProjectsSidebar />
                </div>
                <ResizeHandle direction="col" onMouseDown={projectsCol.onMouseDown} onDoubleClick={projectsCol.reset} />
              </>
            )}

            {/* Terminal — takes remaining space */}
            <div className="flex-1 min-w-0 min-h-0">
              <TerminalPanel />
            </div>

            {/* Files column */}
            {!sidebarCollapsed && (
              <>
                <ResizeHandle direction="col" onMouseDown={filesCol.onMouseDown} onDoubleClick={filesCol.reset} />
                <div style={{ width: `${filesCol.pct}%` }} className="shrink-0 h-full">
                  <FileExplorer />
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Vertical layout — technical on left, browser on right ─────────────────────

interface VerticalProps {
  activeProject: ReturnType<typeof useActiveProject>
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  isFullscreen: boolean
  projectsCol: ReturnType<typeof usePanelResize>
  browserV: ReturnType<typeof usePanelResize>
}

function VerticalLayout({ activeProject, sidebarCollapsed, toggleSidebar, isFullscreen, projectsCol, browserV }: VerticalProps) {
  return (
    <div className="flex-1 min-w-0 min-h-0 flex">
      {!isFullscreen && (
        <>
          {/* Left — Technical panel (sidebar + terminal) */}
          <div className="flex min-h-0" style={{ width: `${100 - browserV.pct}%` }}>
            {/* Projects+Files column (stacked) */}
            {!sidebarCollapsed && (
              <>
                <div style={{ width: `${projectsCol.pct}%` }} className="shrink-0 h-full flex flex-col">
                  {/* Drag region for macOS title bar */}
                  <div className="drag-region h-10 w-full shrink-0" />
                  <div className="flex-1 min-h-0 flex flex-col">
                    <ProjectsSidebar />
                    <div className="border-t border-edge shrink-0" />
                    <div className="flex-1 min-h-0">
                      <FileExplorer />
                    </div>
                  </div>
                </div>
                <ResizeHandle direction="col" onMouseDown={projectsCol.onMouseDown} onDoubleClick={projectsCol.reset} />
              </>
            )}

            {/* Terminal — takes remaining space */}
            <div className="flex-1 min-w-0 min-h-0">
              <TerminalPanel />
            </div>
          </div>

          {/* Vertical resize handle */}
          <ResizeHandle direction="col" onMouseDown={browserV.onMouseDown} onDoubleClick={browserV.reset} />
        </>
      )}

      {/* Right — Visual panel (browser or canvas) */}
      <div
        className="min-h-0 flex flex-col"
        style={isFullscreen ? { flex: 1 } : { width: `${browserV.pct}%` }}
      >
        {activeProject && (
          <BrowserPanel projectId={activeProject.id} defaultUrl={`http://localhost:${activeProject.port}`} layout="vertical" />
        )}
      </div>
    </div>
  )
}

// ── Shared components ─────────────────────────────────────────────────────────

function ResizeHandle({ direction, onMouseDown, onDoubleClick }: {
  direction: 'col' | 'row'
  onMouseDown: (e: React.MouseEvent) => void
  onDoubleClick: () => void
}) {
  const isCol = direction === 'col'
  return (
    <div
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      className={`no-drag shrink-0 group flex z-10 ${
        isCol ? 'cursor-col-resize justify-center' : 'cursor-row-resize flex-col items-center'
      }`}
      style={isCol
        ? { width: 7, marginLeft: -3, marginRight: -3 }
        : { height: 7, marginTop: -3, marginBottom: -3 }
      }
    >
      <div className={`${isCol ? 'w-px h-full' : 'h-px w-full'} bg-edge group-hover:bg-overlay transition-colors`} />
    </div>
  )
}

