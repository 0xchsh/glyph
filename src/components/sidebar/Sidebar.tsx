import { useState, useRef, useEffect, useCallback } from 'react'
import { useProjectStore, useActiveProject } from '../../stores/project-store'
import { useSettingsStore } from '../../stores/settings-store'
import { useAddProject } from '../../lib/use-add-project'
import { ProjectItem } from './ProjectItem'
import { FileTree } from './FileTree'
import { Plus, Gear, FolderOpen, Globe, Lightning, ArrowsInLineVertical } from '@phosphor-icons/react'

export function Sidebar({ collapsed, onToggleCollapse }: { collapsed: boolean; onToggleCollapse: () => void }) {
  const { projects, activeProjectId, setActiveProject } = useProjectStore()
  const activeProject = useActiveProject()
  const { openSettings } = useSettingsStore()
  const { openFolder, cloneFromUrl, quickStart } = useAddProject()
  const [menuOpen, setMenuOpen] = useState(false)
  const [collapseKey, setCollapseKey] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)
  const collapseAll = useCallback(() => setCollapseKey(k => k + 1), [])

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  return (
    <div className="flex flex-col h-full w-full bg-base border-r border-edge">
      {/* Drag handle with collapse toggle */}
      <div className="drag-region h-10 w-full shrink-0 relative">
        <button
          onClick={onToggleCollapse}
          className="no-drag absolute left-16 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 text-zinc-400 hover:text-zinc-200 hover:bg-white/10 rounded transition-colors"
          title="Collapse sidebar"
        >
          <SidebarIcon />
        </button>
      </div>
      <div className="no-drag flex items-center justify-between px-3.5 pb-2 shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-t3">
          Projects
        </span>
        <div className="flex items-center gap-1">
        <div ref={menuRef} className="relative flex items-center">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="text-icon-accent hover:text-accent transition-colors p-0.5 rounded"
            title="Add project"
          >
            <Plus size={14} weight="bold" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 flex flex-col bg-panel border border-edge rounded-lg shadow-xl z-50 w-44 overflow-hidden">
              <MenuItem icon={<FolderOpen size={13} />} label="Open folder" onClick={() => { openFolder(); setMenuOpen(false) }} />
              <MenuItem icon={<Globe size={13} />} label="Clone from URL" onClick={() => { cloneFromUrl(); setMenuOpen(false) }} />
              <MenuItem icon={<Lightning size={13} />} label="Quick start" onClick={() => { quickStart(); setMenuOpen(false) }} />
            </div>
          )}
        </div>
          <button
            onClick={() => openSettings()}
            className="text-icon-accent hover:text-accent transition-colors p-0.5 rounded"
            title="Settings"
          >
            <Gear size={14} />
          </button>
        </div>
      </div>

      {/* Project list — fixed max height, scrollable */}
      <div className="overflow-y-auto px-2 pt-1 pb-3 shrink-0" style={{ maxHeight: 180 }}>
        {projects.length === 0 ? (
          <p className="text-[12px] text-t4 px-2 py-3 text-center">
            No projects yet
          </p>
        ) : (
          projects.map((project) => (
            <ProjectItem
              key={project.id}
              project={project}
              isActive={project.id === activeProjectId}
              onClick={() => setActiveProject(project.id)}
            />
          ))
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-edge-accent shrink-0" />

      {/* Files section — flex-1 so it fills remaining space */}
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between px-3.5 pt-4 pb-2 shrink-0">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-t4">
            Files
          </span>
          {activeProject && (
            <button
              onClick={collapseAll}
              className="text-icon-accent hover:text-accent transition-colors p-0.5 rounded"
              title="Collapse all folders"
            >
              <ArrowsInLineVertical size={14} weight="regular" />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-1">
          {activeProject ? (
            <FileTree key={collapseKey} projectPath={activeProject.path} projectId={activeProject.id} />
          ) : (
            <p className="text-xs text-t4 px-3 py-2">
              Open a project to see files
            </p>
          )}
        </div>
      </div>

    </div>
  )
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 px-3 py-2 text-xs text-t2 hover:bg-overlay hover:text-t1 transition-colors text-left w-full"
    >
      <span className="text-icon-accent">{icon}</span>
      {label}
    </button>
  )
}

function SidebarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 256 256" fill="currentColor">
      <path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40ZM40,56H88V200H40ZM216,200H104V56H216V200Z" />
    </svg>
  )
}
