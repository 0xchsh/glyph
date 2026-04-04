import { useState, useRef, useEffect } from 'react'
import { useProjectStore, useActiveProject } from '../../stores/project-store'
import { useSettingsStore } from '../../stores/settings-store'
import { useAddProject } from '../../lib/use-add-project'
import { ProjectItem } from './ProjectItem'
import { FileTree } from './FileTree'
import { Plus, Gear, FolderOpen, Globe, Lightning } from '@phosphor-icons/react'

export function Sidebar() {
  const { projects, activeProjectId, setActiveProject } = useProjectStore()
  const activeProject = useActiveProject()
  const { openSettings } = useSettingsStore()
  const { openFolder, cloneFromUrl, quickStart } = useAddProject()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-r border-zinc-800" style={{ width: 240, minWidth: 200, maxWidth: 320 }}>
      {/* Header — pt-10 clears the global drag region */}
      <div className="no-drag flex items-center justify-between px-3.5 pt-10 pb-2 shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
          Projects
        </span>
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-0.5 rounded"
            title="Add project"
          >
            <Plus size={14} weight="bold" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 flex flex-col bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 w-44 overflow-hidden">
              <MenuItem icon={<FolderOpen size={13} />} label="Open folder" onClick={() => { openFolder(); setMenuOpen(false) }} />
              <MenuItem icon={<Globe size={13} />} label="Clone from URL" onClick={() => { cloneFromUrl(); setMenuOpen(false) }} />
              <MenuItem icon={<Lightning size={13} />} label="Quick start" onClick={() => { quickStart(); setMenuOpen(false) }} />
            </div>
          )}
        </div>
      </div>

      {/* Project list — fixed max height, scrollable */}
      <div className="overflow-y-auto px-2 py-1 shrink-0" style={{ maxHeight: 180 }}>
        {projects.length === 0 ? (
          <p className="text-[12px] text-zinc-600 px-2 py-3 text-center">
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
      <div className="border-t border-zinc-800/60 shrink-0" />

      {/* Files section — flex-1 so it fills remaining space */}
      <div className="flex flex-col flex-1 min-h-0">
        <div className="px-3.5 py-2 shrink-0">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
            Files
          </span>
        </div>
        <div className="flex-1 overflow-y-auto px-1">
          {activeProject ? (
            <FileTree projectPath={activeProject.path} />
          ) : (
            <p className="text-xs text-zinc-600 px-3 py-2">
              Open a project to see files
            </p>
          )}
        </div>
      </div>

      {/* Ports section — fixed bottom */}
      <div className="border-t border-zinc-800/60 px-3.5 py-3 shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600 block mb-2">
          Ports
        </span>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
          <span className="text-[12px] text-zinc-600">No active server</span>
        </div>
      </div>

      {/* Settings button */}
      <div className="border-t border-zinc-800/60 px-3 py-2 shrink-0 flex justify-end">
        <button
          onClick={() => openSettings()}
          className="text-zinc-600 hover:text-zinc-300 transition-colors p-1.5 rounded"
          title="Settings"
        >
          <Gear size={15} />
        </button>
      </div>
    </div>
  )
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors text-left w-full"
    >
      <span className="text-zinc-500">{icon}</span>
      {label}
    </button>
  )
}
