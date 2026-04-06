import { useState, useEffect, useMemo } from 'react'
import { Folder, FolderOpen } from '@phosphor-icons/react'
import { useEditorStore } from '../../stores/editor-store'
import { getFileIcon } from '../../lib/file-icons'

interface DirEntry {
  name: string
  path: string
  isDirectory: boolean
}

// Git status XY codes → indicator config
function getGitIndicator(xy: string): { color: string; title: string } | null {
  const x = xy[0]
  const y = xy[1]
  if (x === 'D' || y === 'D') return { color: '#ef4444', title: 'Deleted' }
  if (x === '?' && y === '?') return { color: '#4ade80', title: 'Untracked' }
  if (x !== ' ' && x !== '?') return { color: '#86efac', title: 'Staged' }
  if (y === 'M') return { color: '#fbbf24', title: 'Modified' }
  return null
}

interface FileTreeNodeProps {
  entry: DirEntry
  depth: number
  projectId: string
  projectRoot: string
  gitStatus: Record<string, string>
  ignoredSet: Set<string>
}

function FileTreeNode({ entry, depth, projectId, projectRoot, gitStatus, ignoredSet }: FileTreeNodeProps) {
  const { openFile } = useEditorStore()
  const [expanded, setExpanded] = useState(false)
  const [children, setChildren] = useState<DirEntry[] | null>(null)
  const [loading, setLoading] = useState(false)

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
    if (!entry.isDirectory) {
      openFile(projectId, entry.path)
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

  const { icon: FileIcon, color: iconColor } = entry.isDirectory
    ? { icon: null, color: '' }
    : getFileIcon(entry.name)

  return (
    <div className={opacity}>
      <button
        onClick={handleClick}
        className={`w-full flex items-center gap-1 py-0.5 rounded hover:bg-accent-10 cursor-pointer text-left ${labelColor}`}
        style={{ paddingLeft: `${8 + depth * 12}px`, paddingRight: '8px', height: '24px' }}
        title={entry.path}
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

        <span className="text-xs truncate leading-none flex-1">{entry.name}</span>

        {loading && (
          <span className="text-t4 text-xs shrink-0">…</span>
        )}

        {gitIndicator && (
          <span
            className="shrink-0 w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: gitIndicator.color }}
            title={gitIndicator.title}
          />
        )}
      </button>

      {entry.isDirectory && expanded && children !== null && (
        <div>
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
}

function sortEntries(entries: DirEntry[]): DirEntry[] {
  return [...entries].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

interface FileTreeProps {
  projectPath: string
  projectId: string
}

export function FileTree({ projectPath, projectId }: FileTreeProps) {
  const [rootEntries, setRootEntries] = useState<DirEntry[] | null>(null)
  const [gitStatus, setGitStatus] = useState<Record<string, string>>({})
  const [ignoredPaths, setIgnoredPaths] = useState<string[]>([])

  const ignoredSet = useMemo(() => new Set(ignoredPaths), [ignoredPaths])

  useEffect(() => {
    setRootEntries(null)
    window.electron
      .readDir(projectPath)
      .then((entries) => setRootEntries(sortEntries(entries)))
      .catch(() => setRootEntries([]))
  }, [projectPath])

  useEffect(() => {
    setGitStatus({})
    setIgnoredPaths([])
    window.electron.gitStatus(projectPath).then(setGitStatus).catch(() => {})
    window.electron.gitIgnored(projectPath).then(setIgnoredPaths).catch(() => {})
  }, [projectPath])

  if (rootEntries === null) return null

  if (rootEntries.length === 0) {
    return <p className="text-xs text-t4 px-3 py-2">No files found</p>
  }

  return (
    <div className="py-1">
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
  )
}
