import { useState, useCallback } from 'react'
import { useActiveProject } from '../../stores/project-store'
import { ArrowsInLineVertical } from '@phosphor-icons/react'
import { FileTree } from './FileTree'

export function FileExplorer() {
  const activeProject = useActiveProject()
  const [collapseKey, setCollapseKey] = useState(0)
  const collapseAll = useCallback(() => setCollapseKey(k => k + 1), [])

  return (
    <div className="flex flex-col h-full w-full bg-base overflow-hidden">
      <div className="flex items-center justify-between px-3.5 pt-3 pb-2 shrink-0">
        <span className="text-[11px] font-semibold text-t4">
          Files
        </span>
        {activeProject && (
          <button
            onClick={collapseAll}
            className="text-icon-accent hover:text-accent transition-colors p-0.5 rounded"
            title="Collapse all folders"
            aria-label="Collapse all folders"
          >
            <ArrowsInLineVertical size={14} weight="regular" />
          </button>
        )}
      </div>
      <div className="sidebar-scroll flex-1 overflow-y-auto px-1 pb-3">
        {activeProject ? (
          <FileTree key={collapseKey} projectPath={activeProject.path} projectId={activeProject.id} />
        ) : (
          <p className="text-xs text-t4 px-3 py-2">
            Open a project to see files
          </p>
        )}
      </div>
    </div>
  )
}
