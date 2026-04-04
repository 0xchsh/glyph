import { GlyphProject } from '../../stores/project-store'
import { monogram } from '../../lib/colors'

interface Props {
  project: GlyphProject
  isActive: boolean
  onClick: () => void
}

export function ProjectItem({ project, isActive, onClick }: Props) {
  const mono = monogram(project.name)

  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left
        transition-colors duration-100 group
        ${isActive ? 'bg-zinc-800' : 'hover:bg-zinc-800/60'}
      `}
    >
      {/* Project icon */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border"
        style={{
          backgroundColor: `${project.color}18`,
          borderColor: `${project.color}35`,
        }}
      >
        <span
          className="text-[13px] font-bold font-mono leading-none"
          style={{ color: project.color }}
        >
          {mono}
        </span>
      </div>

      {/* Name + port */}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-zinc-200 truncate leading-tight">
          {project.name}
        </div>
        <div className="text-[11px] text-zinc-500 leading-tight mt-0.5">
          localhost:{project.port}
        </div>
      </div>

      {/* Active dot */}
      {isActive && (
        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
      )}
    </button>
  )
}
