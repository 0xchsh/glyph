import { useState, useEffect } from 'react'
import * as PhosphorIcons from '@phosphor-icons/react'
import { GlyphProject } from '../../stores/project-store'
import { useTerminalStore } from '../../stores/terminal-store'
import { getPaletteHex } from '../../lib/palettes'
import { monogram } from '../../lib/colors'

// Stable empty reference — never recreated, so Zustand's snapshot check stays stable
const EMPTY_TABS: never[] = []

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

function Spinner() {
  const [frame, setFrame] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setFrame(f => (f + 1) % SPINNER_FRAMES.length), 80)
    return () => clearInterval(id)
  }, [])
  return (
    <span className="font-mono text-[11px] text-t3 flex-shrink-0 mr-0.5 leading-none">
      {SPINNER_FRAMES[frame]}
    </span>
  )
}

interface Props {
  project: GlyphProject
  isActive: boolean
  onClick: () => void
}

export function ProjectItem({ project, isActive, onClick }: Props) {
  const mono = monogram(project.name)
  const accent = getPaletteHex(project.palette)
  const iconName = project.icon && project.icon !== 'auto' ? project.icon : null
  const IconComponent = iconName ? (PhosphorIcons as Record<string, React.ElementType>)[iconName] : null

  const tabs = useTerminalStore(s => s.tabs[project.id] ?? EMPTY_TABS)
  const anyBusy = useTerminalStore(s => {
    const t = s.tabs[project.id]
    return t ? t.some(tab => s.busyTerminals[tab.id]) : false
  })
  const hasTerminals = tabs.length > 0

  return (
    <div className="relative">
      <button
        onClick={onClick}
        style={{ '--accent-hex': accent } as React.CSSProperties}
        className={`
          w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left
          transition-colors duration-100
          ${isActive ? 'bg-accent-10' : 'hover:bg-accent-10'}
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
          {IconComponent ? (
            <IconComponent size={16} weight="regular" style={{ color: accent }} />
          ) : (
            <span
              className="text-[13px] font-bold font-mono leading-none"
              style={{ color: accent }}
            >
              {mono}
            </span>
          )}
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

        {/* Status indicator */}
        {anyBusy ? (
          <Spinner />
        ) : hasTerminals ? (
          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mr-1 bg-green-500" />
        ) : isActive ? (
          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mr-1" style={{ backgroundColor: accent }} />
        ) : null}
      </button>
    </div>
  )
}
