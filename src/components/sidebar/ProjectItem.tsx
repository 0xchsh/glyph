import { GlyphProject } from '../../stores/project-store'
import { getPaletteHex } from '../../lib/palettes'
import { monogram } from '../../lib/colors'

interface Props {
  project: GlyphProject
  isActive: boolean
  onClick: () => void
}

export function ProjectItem({ project, isActive, onClick }: Props) {
  const mono = monogram(project.name)
  const accent = getPaletteHex(project.palette)

  return (
    <div className="relative">
      <button
        onClick={onClick}
        className={`
          w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left
          transition-colors duration-100
          ${isActive ? 'bg-accent-10' : 'hover:bg-overlay-60'}
        `}
      >
        {/* Project icon */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border"
          style={{
            backgroundColor: `${accent}18`,
            borderColor: `${accent}35`,
          }}
        >
          <span
            className="text-[13px] font-bold font-mono leading-none"
            style={{ color: accent }}
          >
            {mono}
          </span>
        </div>

        {/* Name + port */}
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-t1 truncate leading-tight">
            {project.name}
          </div>
          <div className="text-[11px] text-t3 leading-tight mt-0.5">
            localhost:{project.port}
          </div>
        </div>

        {/* Active dot */}
        {isActive && (
          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mr-1" style={{ backgroundColor: accent }} />
        )}
      </button>
    </div>
  )
}
