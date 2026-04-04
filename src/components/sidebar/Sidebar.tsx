import { useProjectStore, useActiveProject } from '../../stores/project-store'
import { useSettingsStore } from '../../stores/settings-store'
import { ProjectItem } from './ProjectItem'
import { FileTree } from './FileTree'
import { Plus, Gear } from '@phosphor-icons/react'

export function Sidebar() {
  const { projects, activeProjectId, setActiveProject, addProject } = useProjectStore()
  const activeProject = useActiveProject()
  const { openSettings } = useSettingsStore()

  const handleAddProject = async () => {
    const path = await window.electron.openFolderDialog()
    if (path) addProject(path)
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-r border-zinc-800" style={{ width: 240, minWidth: 200, maxWidth: 320 }}>
      {/* Header — pt-10 clears the global drag region */}
      <div className="no-drag flex items-center justify-between px-3.5 pt-10 pb-2 shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
          Projects
        </span>
        <button
          onClick={handleAddProject}
          className="text-zinc-500 hover:text-zinc-300 transition-colors p-0.5 rounded"
          title="Add project"
        >
          <Plus size={14} weight="bold" />
        </button>
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
