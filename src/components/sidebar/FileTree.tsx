import { useState, useEffect, useMemo, useCallback, useRef, createContext, useContext, memo } from 'react'
import { Folder, FolderOpen } from '@phosphor-icons/react'
import { useEditorStore } from '../../stores/editor-store'
import { useTerminalStore } from '../../stores/terminal-store'
import { useSettingsStore } from '../../stores/settings-store'
import { getFileIcon } from '../../lib/file-icons'

interface DirEntry {
  name: string
  path: string
  isDirectory: boolean
}

// ── Shared context ────────────────────────────────────────────────────────────

const FileTreeContext = createContext<{ refresh: () => void }>({ refresh: () => {} })

// ── Git helpers ───────────────────────────────────────────────────────────────

function getGitIndicator(xy: string): { color: string; title: string } | null {
  const x = xy[0]
  const y = xy[1]
  if (x === 'D' || y === 'D') return { color: '#ef4444', title: 'Deleted' }
  if (x === '?' && y === '?') return { color: '#4ade80', title: 'Untracked' }
  if (x !== ' ' && x !== '?') return { color: '#86efac', title: 'Staged' }
  if (y === 'M') return { color: '#fbbf24', title: 'Modified' }
  return null
}

// ── Context menu ──────────────────────────────────────────────────────────────

interface MenuState {
  x: number
  y: number
  entry: DirEntry
}

// ── Delete confirmation modal ─────────────────────────────────────────────────

function DeleteConfirmModal({
  entry,
  onConfirm,
  onCancel,
}: {
  entry: DirEntry
  onConfirm: (skipFuture: boolean) => void
  onCancel: () => void
}) {
  const [dontAskAgain, setDontAskAgain] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter') onConfirm(dontAskAgain)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel, onConfirm, dontAskAgain])

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onMouseDown={onCancel} />
      <div
        role="alertdialog"
        aria-label="Confirm delete"
        aria-modal="true"
        className="relative bg-panel border border-edge rounded-xl shadow-2xl p-5 w-80 flex flex-col gap-4"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div>
          <p className="text-sm font-medium text-t1">Move to Trash?</p>
          <p className="text-xs text-t3 mt-1 break-all">
            "{entry.name}" will be moved to the Trash.
          </p>
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={dontAskAgain}
            onChange={(e) => setDontAskAgain(e.target.checked)}
            className="accent-accent w-3.5 h-3.5"
          />
          <span className="text-xs text-t3">Don't ask me again</span>
        </label>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs text-t2 hover:text-t1 rounded hover:bg-overlay transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(dontAskAgain)}
            className="px-3 py-1.5 text-xs text-red-400 border border-red-900/50 rounded hover:bg-red-950/40 hover:text-red-300 transition-colors"
          >
            Move to Trash
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Context menu ──────────────────────────────────────────────────────────────

interface MenuState {
  x: number
  y: number
  entry: DirEntry
}

function FileContextMenu({
  menu,
  projectRoot,
  projectId,
  onClose,
  onStartRename,
}: {
  menu: MenuState
  projectRoot: string
  projectId: string
  onClose: () => void
  onStartRename: () => void
}) {
  const { refresh } = useContext(FileTreeContext)
  const { removeTab } = useTerminalStore()
  const { confirmDelete } = useSettingsStore()
  const set = useSettingsStore.setState
  const [showConfirm, setShowConfirm] = useState(false)

  // Close on any outside mousedown or Escape (only when confirm modal isn't open)
  useEffect(() => {
    if (showConfirm) return
    const close = () => onClose()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose, showConfirm])

  const relPath = menu.entry.path.startsWith(projectRoot)
    ? menu.entry.path.slice(projectRoot.length).replace(/^[/\\]/, '')
    : menu.entry.path

  const doDelete = useCallback(async () => {
    onClose()
    await window.electron.deleteFile(menu.entry.path)
    if (!menu.entry.isDirectory) removeTab(projectId, `file:${menu.entry.path}`)
    refresh()
  }, [menu.entry, projectId, onClose, removeTab, refresh])

  const handleDeleteClick = () => {
    if (confirmDelete) {
      setShowConfirm(true)
    } else {
      doDelete()
    }
  }

  const items = [
    {
      label: 'Reveal in Finder',
      action: () => { window.electron.revealInFinder(menu.entry.path); onClose() },
    },
    {
      label: 'Copy Path',
      action: () => { navigator.clipboard.writeText(menu.entry.path); onClose() },
    },
    {
      label: 'Copy Relative Path',
      action: () => { navigator.clipboard.writeText(relPath); onClose() },
    },
    { separator: true },
    {
      label: 'Rename',
      action: () => { onStartRename(); onClose() },
    },
    {
      label: 'Delete',
      danger: true,
      action: handleDeleteClick,
    },
  ] as const

  // Clamp so menu doesn't overflow viewport
  const x = Math.min(menu.x, window.innerWidth - 176)
  const y = Math.min(menu.y, window.innerHeight - 200)

  return (
    <>
      <div
        className="fixed z-[200] bg-panel border border-edge rounded-lg shadow-xl overflow-hidden py-0.5"
        style={{ left: x, top: y, minWidth: 168 }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {items.map((item, i) =>
          'separator' in item ? (
            <div key={i} className="my-0.5 border-t border-edge" />
          ) : (
            <button
              key={item.label}
              onClick={item.action}
              className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                'danger' in item && item.danger
                  ? 'text-red-400 hover:bg-red-950/40 hover:text-red-300'
                  : 'text-t2 hover:bg-overlay hover:text-t1'
              }`}
            >
              {item.label}
            </button>
          )
        )}
      </div>

      {showConfirm && (
        <DeleteConfirmModal
          entry={menu.entry}
          onConfirm={(skipFuture) => {
            if (skipFuture) set({ confirmDelete: false })
            setShowConfirm(false)
            doDelete()
          }}
          onCancel={() => { setShowConfirm(false); onClose() }}
        />
      )}
    </>
  )
}

// ── File tree node ─────────────────────────────────────────────────────────────

interface FileTreeNodeProps {
  entry: DirEntry
  depth: number
  projectId: string
  projectRoot: string
  gitStatus: Record<string, string>
  ignoredSet: Set<string>
}

const FileTreeNode = memo(function FileTreeNode({ entry, depth, projectId, projectRoot, gitStatus, ignoredSet }: FileTreeNodeProps) {
  const { setFileContent } = useEditorStore()
  const { openFileTab } = useTerminalStore()
  const { refresh } = useContext(FileTreeContext)
  const [expanded, setExpanded] = useState(false)
  const [children, setChildren] = useState<DirEntry[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [contextMenu, setContextMenu] = useState<MenuState | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)

  const relPath = entry.path.startsWith(projectRoot)
    ? entry.path.slice(projectRoot.length).replace(/^[/\\]/, '').replace(/\\/g, '/')
    : entry.path

  const isHidden = entry.name.startsWith('.')
  const isIgnored = entry.isDirectory
    ? ignoredSet.has(relPath + '/') || ignoredSet.has(relPath)
    : ignoredSet.has(relPath)

  const gitXY = !entry.isDirectory ? gitStatus[relPath] : undefined
  const gitIndicator = gitXY ? getGitIndicator(gitXY) : null

  const opacity = isIgnored ? 'opacity-40' : ''
  const labelColor = entry.isDirectory
    ? isHidden ? 'text-t4' : 'text-t2'
    : isHidden ? 'text-t3' : 'text-t2'

  const handleClick = async () => {
    if (renaming) return
    if (!entry.isDirectory) {
      // Load content into editor store cache if not already loaded
      const cached = useEditorStore.getState().fileContents
      if (!(entry.path in cached)) {
        try {
          const content = await window.electron.readFile(entry.path)
          setFileContent(entry.path, content)
        } catch {
          setFileContent(entry.path, '')
        }
      }
      // Open as a tab in the terminal panel
      openFileTab(projectId, entry.path)
      return
    }
    if (!expanded && children === null && !loading) {
      setLoading(true)
      try {
        const raw = await window.electron.readDir(entry.path)
        setChildren(sortEntries(raw))
      } catch {
        setChildren([])
      } finally {
        setLoading(false)
      }
    }
    setExpanded((prev) => !prev)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, entry })
  }

  const startRename = useCallback(() => {
    setRenameValue(entry.name)
    setRenaming(true)
    // Focus after state update
    setTimeout(() => {
      if (renameInputRef.current) {
        renameInputRef.current.focus()
        // Select name without extension for files
        if (!entry.isDirectory) {
          const dotIdx = entry.name.lastIndexOf('.')
          renameInputRef.current.setSelectionRange(0, dotIdx > 0 ? dotIdx : entry.name.length)
        } else {
          renameInputRef.current.select()
        }
      }
    }, 0)
  }, [entry.name, entry.isDirectory])

  const submitRename = async () => {
    const trimmed = renameValue.trim()
    setRenaming(false)
    if (!trimmed || trimmed === entry.name) return
    const dir = entry.path.substring(0, entry.path.lastIndexOf('/'))
    const newPath = `${dir}/${trimmed}`
    try {
      await window.electron.renameFile(entry.path, newPath)
      refresh()
    } catch {
      // silently ignore — file tree will stay as-is
    }
  }

  const { icon: FileIcon, color: iconColor } = entry.isDirectory
    ? { icon: null, color: '' }
    : getFileIcon(entry.name)

  return (
    <div className={opacity} role="treeitem" aria-expanded={entry.isDirectory ? expanded : undefined} aria-label={entry.name}>
      <div
        className={`w-full flex items-center gap-1 py-0.5 rounded hover:bg-accent-10 cursor-pointer ${labelColor}`}
        style={{ paddingLeft: `${8 + depth * 12}px`, paddingRight: '8px', height: '24px' }}
        title={renaming ? undefined : entry.path}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        <span className="shrink-0 flex items-center">
          {entry.isDirectory ? (
            <span className="text-icon-accent">
              {expanded ? (
                <FolderOpen size={13} weight="regular" />
              ) : (
                <Folder size={13} weight="regular" />
              )}
            </span>
          ) : FileIcon ? (
            <FileIcon size={13} weight="regular" color={iconColor} />
          ) : null}
        </span>

        {renaming ? (
          <input
            ref={renameInputRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); submitRename() }
              if (e.key === 'Escape') { e.preventDefault(); setRenaming(false) }
            }}
            onBlur={submitRename}
            onClick={(e) => e.stopPropagation()}
            aria-label="Rename file"
            className="flex-1 text-xs bg-overlay border border-accent rounded px-1 outline-none min-w-0 selectable"
            style={{ height: 18 }}
          />
        ) : (
          <span className="text-xs truncate leading-none flex-1">{entry.name}</span>
        )}

        {loading && (
          <span className="text-t4 text-xs shrink-0">…</span>
        )}

        {gitIndicator && !renaming && (
          <span
            className="shrink-0 w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: gitIndicator.color }}
            title={gitIndicator.title}
            role="status"
            aria-label={gitIndicator.title}
          />
        )}
      </div>

      {contextMenu && (
        <FileContextMenu
          menu={contextMenu}
          projectRoot={projectRoot}
          projectId={projectId}
          onClose={() => setContextMenu(null)}
          onStartRename={startRename}
        />
      )}

      {entry.isDirectory && expanded && children !== null && (
        <div role="group">
          {children.length === 0 ? (
            <div
              className="text-xs text-t4 py-0.5"
              style={{ paddingLeft: `${8 + (depth + 1) * 12}px` }}
            >
              Empty
            </div>
          ) : (
            children.map((child) => (
              <FileTreeNode
                key={child.path}
                entry={child}
                depth={depth + 1}
                projectId={projectId}
                projectRoot={projectRoot}
                gitStatus={gitStatus}
                ignoredSet={ignoredSet}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
})

function sortEntries(entries: DirEntry[]): DirEntry[] {
  return [...entries].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

// ── File tree root ────────────────────────────────────────────────────────────

interface FileTreeProps {
  projectPath: string
  projectId: string
}

export function FileTree({ projectPath, projectId }: FileTreeProps) {
  const [refreshKey, setRefreshKey] = useState(0)
  const [rootEntries, setRootEntries] = useState<DirEntry[] | null>(null)
  const [gitStatus, setGitStatus] = useState<Record<string, string>>({})
  const [ignoredPaths, setIgnoredPaths] = useState<string[]>([])

  const ignoredSet = useMemo(() => new Set(ignoredPaths), [ignoredPaths])
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    setRootEntries(null)
    window.electron
      .readDir(projectPath)
      .then((entries) => setRootEntries(sortEntries(entries)))
      .catch(() => setRootEntries([]))
  }, [projectPath, refreshKey])

  useEffect(() => {
    setGitStatus({})
    setIgnoredPaths([])
    window.electron.gitStatus(projectPath).then(setGitStatus).catch(() => {})
    window.electron.gitIgnored(projectPath).then(setIgnoredPaths).catch(() => {})
  }, [projectPath, refreshKey])

  if (rootEntries === null) return null

  if (rootEntries.length === 0) {
    return <p className="text-xs text-t4 px-3 py-2">No files found</p>
  }

  return (
    <FileTreeContext.Provider value={{ refresh }}>
      <div role="tree" aria-label="File tree" className="py-1">
        {rootEntries.map((entry) => (
          <FileTreeNode
            key={entry.path}
            entry={entry}
            depth={0}
            projectId={projectId}
            projectRoot={projectPath}
            gitStatus={gitStatus}
            ignoredSet={ignoredSet}
          />
        ))}
      </div>
    </FileTreeContext.Provider>
  )
}
