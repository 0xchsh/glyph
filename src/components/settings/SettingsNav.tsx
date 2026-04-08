import { ArrowLeft, Sliders, Terminal, Code, PaintBrush } from '@phosphor-icons/react'
import { useSettingsStore, SettingsSection } from '../../stores/settings-store'
import { useProjectStore } from '../../stores/project-store'
import { getPaletteHex } from '../../lib/palettes'
import { monogram } from '../../lib/colors'

interface NavItem {
  section: SettingsSection
  label: string
  icon: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
  { section: 'general',    label: 'General',    icon: <Sliders size={14} /> },
  { section: 'terminal',   label: 'Terminal',   icon: <Terminal size={14} /> },
  { section: 'editor',     label: 'Editor',     icon: <Code size={14} /> },
  { section: 'appearance', label: 'Appearance', icon: <PaintBrush size={14} /> },
]

export function SettingsNav() {
  const { activeSection, activeProjectSettingsId, closeSettings, setSection, openProjectSettings } = useSettingsStore()
  const { projects } = useProjectStore()

  return (
    <div className="flex flex-col h-full w-full bg-base border-r border-edge overflow-y-auto">
      {/* Drag region spacer */}
      <div className="drag-region h-10 shrink-0" />

      {/* Back button */}
      <div className="no-drag px-3 pb-4 shrink-0">
        <button
          onClick={closeSettings}
          className="flex items-center gap-1.5 text-t2 hover:text-t1 transition-colors py-1 px-1 rounded"
        >
          <ArrowLeft size={12} />
          <span className="text-xs">Back</span>
        </button>
      </div>

      {/* Global settings */}
      <div className="px-3.5 pb-2 shrink-0">
        <span className="text-[11px] font-semibold text-t4">
          Settings
        </span>
      </div>
      <div className="px-2 flex flex-col gap-0.5">
        {NAV_ITEMS.map(({ section, label, icon }) => {
          const isActive = activeSection === section
          return (
            <button
              key={section}
              onClick={() => setSection(section)}
              className={`flex items-center gap-2.5 w-full h-8 px-3 rounded text-sm transition-colors text-left ${
                isActive
                  ? 'bg-accent-10 text-t1'
                  : 'text-t2 hover:text-t1 hover:bg-overlay-50'
              }`}
            >
              {icon}
              {label}
            </button>
          )
        })}
      </div>

      {/* Projects */}
      {projects.length > 0 && (
        <>
          <div className="px-3.5 pt-5 pb-2 shrink-0">
            <span className="text-[11px] font-semibold text-t4">
              Projects
            </span>
          </div>
          <div className="px-2 flex flex-col gap-0.5">
            {projects.map((project) => {
              const isActive = activeSection === 'project' && activeProjectSettingsId === project.id
              const accent = getPaletteHex(project.palette)
              return (
                <button
                  key={project.id}
                  onClick={() => openProjectSettings(project.id)}
                  className={`flex items-center gap-2.5 w-full h-8 px-3 rounded text-sm transition-colors text-left ${
                    isActive
                      ? 'bg-accent-10 text-t1'
                      : 'text-t2 hover:text-t1 hover:bg-overlay-50'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] font-bold font-mono flex-shrink-0"
                    style={{ color: accent }}
                  >
                    {monogram(project.name)}
                  </span>
                  <span className="truncate">{project.name}</span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
