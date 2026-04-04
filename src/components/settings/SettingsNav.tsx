import { ArrowLeft, Sliders, Terminal, Code, PaintBrush } from '@phosphor-icons/react'
import { useSettingsStore, SettingsSection } from '../../stores/settings-store'

interface NavItem {
  section: SettingsSection
  label: string
  icon: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
  { section: 'general', label: 'General', icon: <Sliders size={15} /> },
  { section: 'terminal', label: 'Terminal', icon: <Terminal size={15} /> },
  { section: 'editor', label: 'Editor', icon: <Code size={15} /> },
  { section: 'appearance', label: 'Appearance', icon: <PaintBrush size={15} /> },
]

export function SettingsNav() {
  const { activeSection, closeSettings, setSection } = useSettingsStore()

  return (
    <div
      className="flex flex-col h-full bg-zinc-950"
      style={{ width: 240, minWidth: 200, maxWidth: 320 }}
    >
      {/* Drag region spacer */}
      <div className="h-10 shrink-0" />

      {/* Back button */}
      <div className="px-3 pb-4 shrink-0">
        <button
          onClick={closeSettings}
          className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-100 transition-colors py-1 px-1 rounded"
        >
          <ArrowLeft size={14} />
          <span className="text-sm">Back</span>
        </button>
      </div>

      {/* Section label */}
      <div className="px-3.5 pb-2 shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
          Settings
        </span>
      </div>

      {/* Nav list */}
      <div className="px-2 flex flex-col gap-0.5">
        {NAV_ITEMS.map(({ section, label, icon }) => {
          const isActive = activeSection === section
          return (
            <button
              key={section}
              onClick={() => setSection(section)}
              className={`flex items-center gap-2.5 w-full h-8 px-3 rounded text-sm transition-colors text-left ${
                isActive
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              {icon}
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
