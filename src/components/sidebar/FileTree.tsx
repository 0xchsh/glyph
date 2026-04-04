import { useState, useEffect } from 'react'
import { File, Folder, FolderOpen } from '@phosphor-icons/react'

interface DirEntry {
  name: string
  path: string
  isDirectory: boolean
}

interface FileTreeNodeProps {
  entry: DirEntry
  depth: number
}

function FileTreeNode({ entry, depth }: FileTreeNodeProps) {
  const [expanded, setExpanded] = useState(false)
  const [children, setChildren] = useState<DirEntry[] | null>(null)
  const [loading, setLoading] = useState(false)

  const isHidden = entry.name.startsWith('.')
  const labelColor = entry.isDirectory
    ? isHidden ? 'text-zinc-600' : 'text-zinc-400'
    : isHidden ? 'text-zinc-500' : 'text-zinc-300'

  const handleClick = async () => {
    if (!entry.isDirectory) {
      console.log('open file:', entry.path)
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

  return (
    <div>
      <button
        onClick={handleClick}
        className={`w-full flex items-center gap-1 py-0.5 rounded hover:bg-zinc-800/50 cursor-pointer text-left ${labelColor}`}
        style={{ paddingLeft: `${8 + depth * 12}px`, paddingRight: '8px', height: '24px' }}
        title={entry.path}
      >
        <span className="shrink-0 flex items-center">
          {entry.isDirectory ? (
            expanded ? (
              <FolderOpen size={13} weight="regular" />
            ) : (
              <Folder size={13} weight="regular" />
            )
          ) : (
            <File size={13} weight="regular" />
          )}
        </span>
        <span className="text-xs truncate leading-none">{entry.name}</span>
        {loading && (
          <span className="ml-auto text-zinc-600 text-[10px] shrink-0">…</span>
        )}
      </button>

      {entry.isDirectory && expanded && children !== null && (
        <div>
          {children.length === 0 ? (
            <div
              className="text-xs text-zinc-600 py-0.5"
              style={{ paddingLeft: `${8 + (depth + 1) * 12}px` }}
            >
              Empty
            </div>
          ) : (
            children.map((child) => (
              <FileTreeNode key={child.path} entry={child} depth={depth + 1} />
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
}

export function FileTree({ projectPath }: FileTreeProps) {
  const [rootEntries, setRootEntries] = useState<DirEntry[] | null>(null)

  useEffect(() => {
    setRootEntries(null)
    window.electron
      .readDir(projectPath)
      .then((entries) => setRootEntries(sortEntries(entries)))
      .catch(() => setRootEntries([]))
  }, [projectPath])

  if (rootEntries === null) {
    return null
  }

  if (rootEntries.length === 0) {
    return (
      <p className="text-xs text-zinc-600 px-3 py-2">No files found</p>
    )
  }

  return (
    <div className="py-1">
      {rootEntries.map((entry) => (
        <FileTreeNode key={entry.path} entry={entry} depth={0} />
      ))}
    </div>
  )
}
