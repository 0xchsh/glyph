import { useState } from 'react'
import { Check } from '@phosphor-icons/react'
import { useSettingsStore, ColorMode } from '../../stores/settings-store'
import { useProjectStore } from '../../stores/project-store'
import { PALETTES, PALETTE_KEYS, PaletteKey, getPaletteHex } from '../../lib/palettes'

// ── Controls ─────────────────────────────────────────────────────────────────

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`relative inline-flex w-9 h-5 rounded-full transition-colors duration-200 shrink-0 ${
        value ? 'bg-t2' : 'bg-overlay'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform duration-200 ${
          value ? 'bg-base translate-x-4' : 'bg-t2 translate-x-0'
        }`}
      />
    </button>
  )
}

function Stepper({
  value,
  onChange,
  min,
  max,
}: {
  value: number
  onChange: (v: number) => void
  min: number
  max: number
}) {
  return (
    <div className="flex items-center gap-2 bg-overlay rounded px-2 py-1 shrink-0">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        className="text-t2 hover:text-t1 w-5 text-center transition-colors"
      >
        −
      </button>
      <span className="text-sm text-t1 w-6 text-center">{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        className="text-t2 hover:text-t1 w-5 text-center transition-colors"
      >
        +
      </button>
    </div>
  )
}

// ── Row ───────────────────────────────────────────────────────────────────────

function SettingRow({
  label,
  description,
  control,
}: {
  label: string
  description: string
  control: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-edge-60">
      <div>
        <div className="text-sm text-t1">{label}</div>
        <div className="text-xs text-t3 mt-0.5">{description}</div>
      </div>
      {control}
    </div>
  )
}

// ── Sections ──────────────────────────────────────────────────────────────────

function GeneralSection() {
  const { autoOpenTerminal, showHiddenFiles } = useSettingsStore()
  const set = useSettingsStore.setState

  return (
    <>
      <SettingRow
        label="Auto-open terminal"
        description="Automatically open a terminal when switching to a project"
        control={
          <Toggle
            value={autoOpenTerminal}
            onChange={(v) => set({ autoOpenTerminal: v })}
          />
        }
      />
      <SettingRow
        label="Show hidden files"
        description="Display files and folders starting with a dot in the file tree"
        control={
          <Toggle
            value={showHiddenFiles}
            onChange={(v) => set({ showHiddenFiles: v })}
          />
        }
      />
    </>
  )
}

const SHELL_OPTIONS: { value: 'shell' | 'claude' | 'codex'; label: string; description: string }[] = [
  { value: 'shell', label: 'System shell', description: 'zsh / bash' },
  { value: 'claude', label: 'Claude Code', description: 'claude' },
  { value: 'codex', label: 'Codex', description: 'codex' },
]

function TerminalSection() {
  const { terminalFontSize, defaultShell } = useSettingsStore()
  const set = useSettingsStore.setState

  return (
    <>
      <SettingRow
        label="Terminal font size"
        description="Font size used in the integrated terminal"
        control={
          <Stepper
            value={terminalFontSize}
            onChange={(v) => set({ terminalFontSize: v })}
            min={10}
            max={24}
          />
        }
      />
      <SettingRow
        label="Default terminal"
        description="What opens automatically when you switch to a project"
        control={
          <div className="relative">
            <select
              value={defaultShell}
              onChange={(e) => set({ defaultShell: e.target.value as 'shell' | 'claude' | 'codex' })}
              className="appearance-none bg-overlay text-t1 text-sm rounded px-3 py-1.5 pr-8 outline-none focus:ring-1 focus:ring-edge cursor-pointer selectable"
            >
              {SHELL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({opt.description})
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-t3 text-xs">▾</span>
          </div>
        }
      />
    </>
  )
}

function EditorSection() {
  const { editorFontSize, editorTabSize, editorWordWrap } = useSettingsStore()
  const set = useSettingsStore.setState

  return (
    <>
      <SettingRow
        label="Editor font size"
        description="Font size used in the code editor"
        control={
          <Stepper
            value={editorFontSize}
            onChange={(v) => set({ editorFontSize: v })}
            min={10}
            max={24}
          />
        }
      />
      <SettingRow
        label="Tab size"
        description="Number of spaces per indentation level"
        control={
          <Stepper
            value={editorTabSize}
            onChange={(v) => set({ editorTabSize: v })}
            min={1}
            max={8}
          />
        }
      />
      <SettingRow
        label="Word wrap"
        description="Wrap long lines instead of scrolling horizontally"
        control={
          <Toggle
            value={editorWordWrap}
            onChange={(v) => set({ editorWordWrap: v })}
          />
        }
      />
    </>
  )
}

const COLOR_MODES: { value: ColorMode; label: string; description: string }[] = [
  { value: 'native', label: 'Native', description: 'Follows macOS appearance' },
  { value: 'dark',   label: 'Dark',   description: 'Always dark' },
  { value: 'light',  label: 'Light',  description: 'Always light' },
]

function AppearanceSection() {
  const { colorMode } = useSettingsStore()
  const set = useSettingsStore.setState

  return (
    <SettingRow
      label="Color mode"
      description="Controls the light/dark appearance of the app"
      control={
        <div className="flex gap-1.5">
          {COLOR_MODES.map((mode) => (
            <button
              key={mode.value}
              onClick={() => set({ colorMode: mode.value })}
              title={mode.description}
              className={`px-3 py-1.5 text-xs rounded transition-colors ${
                colorMode === mode.value
                  ? 'bg-overlay text-t1'
                  : 'text-t3 hover:text-t2 hover:bg-overlay-50'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      }
    />
  )
}

function ProjectSection({ projectId }: { projectId: string }) {
  const { projects, removeProject } = useProjectStore()
  const { closeSettings } = useSettingsStore()
  const project = projects.find((p) => p.id === projectId)

  const [name, setName] = useState(project?.name ?? '')
  const [devCommand, setDevCommand] = useState(project?.devCommand ?? '')

  if (!project) {
    return <p className="text-sm text-t3">Project not found.</p>
  }

  const handleRemove = () => {
    removeProject(projectId)
    closeSettings()
  }

  const setPalette = (palette: PaletteKey) => {
    useProjectStore.setState((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, palette } : p
      ),
    }))
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Name */}
      <div className="flex items-center justify-between py-4 border-b border-edge-60">
        <div>
          <div className="text-sm text-t1">Name</div>
          <div className="text-xs text-t3 mt-0.5">Display name for this project</div>
        </div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="selectable appearance-none bg-overlay text-t1 text-sm rounded px-3 py-1.5 outline-none focus:ring-1 focus:ring-edge w-48"
        />
      </div>

      {/* Path */}
      <div className="flex items-center justify-between py-4 border-b border-edge-60">
        <div>
          <div className="text-sm text-t1">Path</div>
          <div className="text-xs text-t3 mt-0.5">Folder on disk</div>
        </div>
        <input
          type="text"
          value={project.path}
          disabled
          className="selectable appearance-none bg-overlay text-t3 text-xs rounded px-3 py-1.5 outline-none w-48 truncate opacity-60 cursor-default"
          title={project.path}
        />
      </div>

      {/* Dev command */}
      <div className="flex items-center justify-between py-4 border-b border-edge-60">
        <div>
          <div className="text-sm text-t1">Dev command</div>
          <div className="text-xs text-t3 mt-0.5">Command to start the dev server</div>
        </div>
        <input
          type="text"
          value={devCommand}
          onChange={(e) => setDevCommand(e.target.value)}
          placeholder="e.g. pnpm dev"
          className="selectable appearance-none bg-overlay text-t1 text-sm rounded px-3 py-1.5 outline-none focus:ring-1 focus:ring-edge w-48 placeholder:text-t4"
        />
      </div>

      {/* Port */}
      <div className="flex items-center justify-between py-4 border-b border-edge-60">
        <div>
          <div className="text-sm text-t1">Port</div>
          <div className="text-xs text-t3 mt-0.5">Dev server port</div>
        </div>
        <span className="text-sm text-t2">{project.port}</span>
      </div>

      {/* Color palette */}
      <div className="flex items-center justify-between py-4 border-b border-edge-60">
        <div>
          <div className="text-sm text-t1">Color</div>
          <div className="text-xs text-t3 mt-0.5">Accent color for this project</div>
        </div>
        <div className="flex gap-2">
          {PALETTE_KEYS.map((key) => {
            const hex = getPaletteHex(key)
            const isActive = project.palette === key
            return (
              <button
                key={key}
                onClick={() => setPalette(key)}
                title={PALETTES[key].label}
                className="w-6 h-6 rounded-full transition-transform hover:scale-110 focus:outline-none flex items-center justify-center"
                style={{
                  backgroundColor: hex,
                  boxShadow: isActive ? `0 0 0 2px var(--bg-panel), 0 0 0 3.5px ${hex}` : undefined,
                }}
              >
                {isActive && <Check size={12} weight="bold" color="white" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Remove */}
      <div className="pt-8">
        <button
          onClick={handleRemove}
          className="px-4 py-2 text-sm text-red-400 border border-red-900/50 rounded hover:bg-red-950/40 hover:text-red-300 transition-colors"
        >
          Remove project
        </button>
        <p className="text-xs text-t4 mt-2">Removes from Glyph only — files are not deleted.</p>
      </div>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────

export function SettingsContent() {
  const { activeSection, activeProjectSettingsId } = useSettingsStore()
  const { projects } = useProjectStore()

  const SECTION_TITLES: Record<string, string> = {
    general:    'General',
    terminal:   'Terminal',
    editor:     'Editor',
    appearance: 'Appearance',
    project:    projects.find((p) => p.id === activeProjectSettingsId)?.name ?? 'Project',
  }

  return (
    <div className="flex-1 bg-panel h-full overflow-y-auto min-w-0 flex flex-col">
      <div className="drag-region h-10 shrink-0" />
      <div className="px-12 pb-10 w-full max-w-3xl mx-auto">
        <h1 className="text-xl font-semibold text-t1 mb-8">
          {SECTION_TITLES[activeSection]}
        </h1>

        {activeSection === 'general' && <GeneralSection />}
        {activeSection === 'terminal' && <TerminalSection />}
        {activeSection === 'editor' && <EditorSection />}
        {activeSection === 'appearance' && <AppearanceSection />}
        {activeSection === 'project' && activeProjectSettingsId && (
          <ProjectSection projectId={activeProjectSettingsId} />
        )}
      </div>
    </div>
  )
}
