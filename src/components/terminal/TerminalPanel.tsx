import { useEffect, useCallback, useState, useRef } from 'react'
import { Plus, X, Terminal as TerminalIcon } from '@phosphor-icons/react'
import { useTerminalStore, TerminalType, TerminalTab } from '../../stores/terminal-store'
import { useActiveProject } from '../../stores/project-store'
import { TerminalInstance, destroyTerminalInstance } from './TerminalInstance'

const EMPTY_TABS: TerminalTab[] = []

const TYPE_LABELS: Record<TerminalType, string> = {
  shell: 'Shell',
  claude: 'Claude',
  codex: 'Codex',
}

export function TerminalPanel() {
  const project = useActiveProject()
  const { addTab, removeTab, setActiveTab } = useTerminalStore()

  const projectId = project?.id ?? ''
  const tabs = useTerminalStore((s) => s.tabs[projectId] ?? EMPTY_TABS)
  const activeTabId = useTerminalStore((s) => s.activeTabId[projectId] ?? null)

  // Track which project IDs we've already auto-opened a shell for.
  // Using a Set in a ref survives strict-mode's mount→unmount→remount cycle,
  // preventing two shells from being spawned on the same project.
  const autoOpened = useRef(new Set<string>())

  const openTab = useCallback(
    async (type: TerminalType) => {
      if (!project) return
      const terminalId = await window.electron.createTerminal(project.id, project.path, type)
      addTab(project.id, {
        id: terminalId,
        type,
        projectId: project.id,
        title: TYPE_LABELS[type],
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

  // Auto-open a shell when the project becomes active and has no terminals
  useEffect(() => {
    if (!project) return
    if (autoOpened.current.has(project.id)) return
    const currentTabs = useTerminalStore.getState().tabs[project.id] ?? []
    if (currentTabs.length > 0) return
    autoOpened.current.add(project.id)
    openTab('shell')
  }, [project?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for terminal process exits (e.g. user types `exit`)
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
        <p className="text-zinc-600 text-xs">No project selected</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Tab bar */}
      <div className="flex items-center border-b border-zinc-800 shrink-0">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => setActiveTab(projectId, tab.id)}
            className={`
              group flex items-center gap-2 px-4 py-2.5 text-sm cursor-pointer select-none
              transition-colors border-r border-zinc-800
              ${tab.id === activeTabId
                ? 'bg-zinc-900 text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40'}
            `}
          >
            <TerminalIcon size={14} weight="regular" />
            <span className="font-medium">{tab.title.toLowerCase()}</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                closeTab(tab.id)
              }}
              className="ml-1 text-zinc-500 hover:text-zinc-200 transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {/* New tab menu */}
        <NewTabButton onSelect={openTab} />
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
              accentColor={project.color}
              active={tab.id === activeTabId}
            />
          </div>
        ))}

        {tabs.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-zinc-700 text-xs">No terminals open</p>
          </div>
        )}
      </div>
    </div>
  )
}

function NewTabButton({ onSelect }: { onSelect: (type: TerminalType) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative px-2 flex items-center">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center w-6 h-6 text-zinc-500 hover:text-zinc-300 rounded transition-colors"
      >
        <Plus size={12} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 flex flex-col bg-zinc-900 border border-zinc-800 rounded shadow-xl z-50 min-w-[120px] overflow-hidden">
          {(['shell', 'claude', 'codex'] as TerminalType[]).map((type) => (
            <button
              key={type}
              onClick={() => { onSelect(type); setOpen(false) }}
              className="px-3 py-2 text-xs text-left text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
            >
              {TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
