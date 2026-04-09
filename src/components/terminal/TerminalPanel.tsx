import { useEffect, useCallback, useState, useRef } from 'react'
import { Plus, X, Terminal as TerminalIcon } from '@phosphor-icons/react'
import { useTerminalStore, TerminalType, TerminalTab } from '../../stores/terminal-store'
import { useActiveProject, useProjectStore } from '../../stores/project-store'
import { useSettingsStore } from '../../stores/settings-store'
import { getPaletteHex } from '../../lib/palettes'
import { getFileIcon } from '../../lib/file-icons'
import { TerminalInstance, destroyTerminalInstance } from './TerminalInstance'
import { FileEditor } from './FileEditor'

function useIsDark(): boolean {
  const colorMode = useSettingsStore((s) => s.colorMode)
  const [isDark, setIsDark] = useState(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    return colorMode === 'dark' || (colorMode === 'native' && mq.matches)
  })
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () =>
      setIsDark(colorMode === 'dark' || (colorMode === 'native' && mq.matches))
    update()
    if (colorMode === 'native') {
      mq.addEventListener('change', update)
      return () => mq.removeEventListener('change', update)
    }
  }, [colorMode])
  return isDark
}

const EMPTY_TABS: TerminalTab[] = []

const TYPE_LABELS: Record<TerminalType, string> = {
  shell: 'Shell',
  claude: 'Claude',
  codex: 'Codex',
}

export function TerminalPanel() {
  const project = useActiveProject()
  const { addTab, removeTab, setActiveTab, reorderTabs } = useTerminalStore()
  const defaultShell = useSettingsStore((s) => s.defaultShell)
  const isDark = useIsDark()
  const sidebarCollapsed = useProjectStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useProjectStore((s) => s.toggleSidebar)

  const projectId = project?.id ?? ''
  const tabs = useTerminalStore((s) => s.tabs[projectId] ?? EMPTY_TABS)
  const activeTabId = useTerminalStore((s) => s.activeTabId[projectId] ?? null)

  const autoOpened = useRef(new Set<string>())
  const dragIndexRef = useRef(-1)

  const openTab = useCallback(
    async (type: TerminalType) => {
      if (!project) return
      const terminalId = await window.electron.createTerminal(project.id, project.path, type)
      addTab(project.id, {
        id: terminalId,
        type,
        projectId: project.id,
        title: TYPE_LABELS[type] ?? type,
      })
    },
    [project, addTab]
  )

  const closeTab = useCallback(
    (tab: TerminalTab) => {
      if (!project) return
      if (tab.type === 'file') {
        // File tabs don't have a terminal process
        removeTab(project.id, tab.id)
      } else {
        window.electron.killTerminal(tab.id)
        destroyTerminalInstance(tab.id)
        removeTab(project.id, tab.id)
      }
    },
    [project, removeTab]
  )

  useEffect(() => {
    if (!project) return
    if (autoOpened.current.has(project.id)) return
    const currentTabs = useTerminalStore.getState().tabs[project.id] ?? []
    if (currentTabs.length > 0) return
    autoOpened.current.add(project.id)
    openTab(defaultShell)
  }, [project?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!project) return
    const unsub = window.electron.onTerminalExit((terminalId) => {
      destroyTerminalInstance(terminalId)
      removeTab(project.id, terminalId)
    })
    return unsub
  }, [project?.id, removeTab])

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-t4 text-xs">No project selected</p>
      </div>
    )
  }

  const accentColor = getPaletteHex(project.palette)

  return (
    <div className="flex flex-col h-full bg-base">
      {/* Tab bar */}
      <div role="tablist" aria-label="Terminal tabs" className="flex items-center shrink-0 h-10 drag-region bg-panel">
        {sidebarCollapsed && (
          <button
            onClick={toggleSidebar}
            className="no-drag shrink-0 flex items-center justify-center w-10 h-full text-t3 hover:text-t1 hover:bg-overlay-30 transition-colors border-r border-edge"
            title="Show sidebar"
          >
            <svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor">
              <path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40ZM40,56H88V200H40ZM216,200H104V56H216V200Z" />
            </svg>
          </button>
        )}
        {tabs.map((tab, index) => {
          const isFile = tab.type === 'file'
          const fileIcon = isFile ? getFileIcon(tab.title) : null
          const FileIcon = fileIcon?.icon
          return (
            <div
              key={tab.id}
              role="tab"
              aria-selected={tab.id === activeTabId}
              tabIndex={tab.id === activeTabId ? 0 : -1}
              draggable
              onDragStart={() => { dragIndexRef.current = index }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndexRef.current >= 0 && dragIndexRef.current !== index) {
                  reorderTabs(projectId, dragIndexRef.current, index)
                }
                dragIndexRef.current = -1
              }}
              onClick={() => setActiveTab(projectId, tab.id)}
              className={`
                no-drag group relative flex items-center gap-2 px-4 h-full text-xs cursor-pointer select-none
                transition-colors border-r border-edge
                ${tab.id === activeTabId
                  ? 'bg-panel text-t1'
                  : 'text-t3 hover:text-t2 hover:bg-overlay-30'}
              `}
            >
              {isFile && FileIcon ? (
                <FileIcon size={12} weight="regular" color={fileIcon.color} />
              ) : (
                <TerminalIcon size={12} weight="regular" />
              )}
              <span className="font-medium truncate max-w-[120px]">{(tab.title ?? tab.type).toLowerCase()}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  closeTab(tab)
                }}
                aria-label={`Close ${tab.title ?? tab.type}`}
                className="ml-1 text-t3 hover:text-t1 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          )
        })}

        <div className="no-drag"><NewTabButton onSelect={openTab} /></div>
      </div>

      {/* Content — terminals + file editors, only active is visible */}
      <div className="flex-1 relative overflow-hidden">
        {tabs.map((tab) =>
          tab.type === 'file' ? (
            <div
              key={tab.id}
              className="absolute inset-0"
              style={{ display: tab.id === activeTabId ? 'block' : 'none' }}
            >
              <FileEditor
                filePath={tab.filePath!}
                active={tab.id === activeTabId}
              />
            </div>
          ) : (
            <div
              key={tab.id}
              className="absolute inset-0"
              style={{ display: tab.id === activeTabId ? 'block' : 'none' }}
            >
              <TerminalInstance
                terminalId={tab.id}
                accentColor={accentColor}
                active={tab.id === activeTabId}
                isDark={isDark}
              />
            </div>
          )
        )}

        {tabs.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-t4 text-xs">No terminals open</p>
          </div>
        )}
      </div>
    </div>
  )
}

function NewTabButton({ onSelect }: { onSelect: (type: TerminalType) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative px-2 flex items-center">
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="New terminal"
        aria-expanded={open}
        className="flex items-center justify-center w-6 h-6 text-t3 hover:text-t2 rounded transition-colors"
      >
        <Plus size={12} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 flex flex-col bg-panel border border-edge rounded shadow-xl z-50 min-w-[120px] overflow-hidden">
          {(['shell', 'claude', 'codex'] as TerminalType[]).map((type) => (
            <button
              key={type}
              onClick={() => { onSelect(type); setOpen(false) }}
              className="px-3 py-2 text-xs text-left text-t2 hover:bg-overlay hover:text-t1 transition-colors"
            >
              {TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
