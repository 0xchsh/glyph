import { Sidebar } from './components/sidebar/Sidebar'
import { StartScreen } from './components/start/StartScreen'
import { TerminalPanel } from './components/terminal/TerminalPanel'
import { SettingsNav } from './components/settings/SettingsNav'
import { SettingsContent } from './components/settings/SettingsContent'
import { useProjectStore } from './stores/project-store'
import { useSettingsStore } from './stores/settings-store'

export default function App() {
  const { projects } = useProjectStore()
  const { isOpen: isSettingsOpen } = useSettingsStore()
  const hasProjects = projects.length > 0

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-50">
      {/* Always-present drag region for macOS window dragging */}
      <div className="drag-region h-10 w-full shrink-0 absolute top-0 left-0 right-0 z-0" />
      <div className="no-drag flex flex-1 min-h-0">
        {hasProjects ? (
          <>
            {isSettingsOpen ? (
              <>
                <SettingsNav />
                <SettingsContent />
              </>
            ) : (
              <>
                <Sidebar />
                {/* Center — editor / browser — grows to fill remaining space */}
                <div className="flex-1 flex items-center justify-center bg-zinc-900 min-w-0">
                  <p className="text-zinc-600 text-sm">Select a file or open the browser tab</p>
                </div>
              </>
            )}
            {/* Right — terminal column — hidden in settings */}
            {!isSettingsOpen && (
              <div className="w-[420px] shrink-0 border-l border-zinc-800">
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
