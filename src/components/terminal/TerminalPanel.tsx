import { useEffect, useCallback, useState, useRef } from 'react'
import { Plus, X, Terminal as TerminalIcon } from '@phosphor-icons/react'
import { useTerminalStore, TerminalType, TerminalTab } from '../../stores/terminal-store'
import { useActiveProject } from '../../stores/project-store'
import { useSettingsStore } from '../../stores/settings-store'
import { getPaletteHex } from '../../lib/palettes'
import { TerminalInstance, destroyTerminalInstance } from './TerminalInstance'

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
  const { addTab, removeTab, setActiveTab } = useTerminalStore()
  const defaultShell = useSettingsStore((s) => s.defaultShell)
  const isDark = useIsDark()

  const projectId = project?.id ?? ''
  const tabs = useTerminalStore((s) => s.tabs[projectId] ?? EMPTY_TABS)
  const activeTabId = useTerminalStore((s) => s.activeTabId[projectId] ?? null)

  const autoOpened = useRef(new Set<string>())

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
    (tabId: string) => {
      if (!project) return
      window.electron.killTerminal(tabId)
      destroyTerminalInstance(tabId)
      removeTab(project.id, tabId)
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
      <div className="drag-region flex items-center border-b border-edge shrink-0 h-10">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => setActiveTab(projectId, tab.id)}
            className={`
              no-drag group relative flex items-center gap-2 px-4 py-2.5 text-xs cursor-pointer select-none
              transition-colors border-r border-edge
              ${tab.id === activeTabId
                ? 'bg-panel text-t1'
                : 'text-t3 hover:text-t2 hover:bg-overlay-30'}
            `}
          >
            <TerminalIcon size={12} weight="regular" />
            <span className="font-medium">{(tab.title ?? tab.type).toLowerCase()}</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                closeTab(tab.id)
              }}
              className="ml-1 text-t3 hover:text-t1 transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        ))}

        <div className="no-drag"><NewTabButton onSelect={openTab} /></div>
      </div>

      {/* Terminal instances — all mounted, only active is visible */}
      <div className="flex-1 relative overflow-hidden">
        {tabs.map((tab) => (
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
        ))}

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
