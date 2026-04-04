import { useSettingsStore } from '../../stores/settings-store'

// ── Controls ─────────────────────────────────────────────────────────────────

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${
        value ? 'bg-zinc-300' : 'bg-zinc-700'
      }`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-zinc-950 transition-transform ${
          value ? 'translate-x-[18px]' : 'translate-x-0.5'
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
    <div className="flex items-center gap-2 bg-zinc-800 rounded px-2 py-1 shrink-0">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        className="text-zinc-400 hover:text-zinc-100 w-5 text-center transition-colors"
      >
        −
      </button>
      <span className="text-sm text-zinc-200 w-6 text-center">{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        className="text-zinc-400 hover:text-zinc-100 w-5 text-center transition-colors"
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
    <div className="flex items-center justify-between py-4 border-b border-zinc-800/60">
      <div>
        <div className="text-sm text-zinc-200">{label}</div>
        <div className="text-xs text-zinc-500 mt-0.5">{description}</div>
      </div>
      {control}
    </div>
  )
}

// ── Sections ──────────────────────────────────────────────────────────────────

function GeneralSection() {
  const { autoOpenTerminal, showHiddenFiles, setSection: _s, ...store } = useSettingsStore()
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
        label="Default shell"
        description="Override the shell used for new terminals (leave blank to use system default)"
        control={
          <input
            type="text"
            value={defaultShell}
            onChange={(e) => set({ defaultShell: e.target.value })}
            placeholder="System default"
            className="bg-zinc-800 text-zinc-200 text-sm rounded px-3 py-1.5 w-48 outline-none focus:ring-1 focus:ring-zinc-600 selectable"
            spellCheck={false}
          />
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

function AppearanceSection() {
  return (
    <SettingRow
      label="Theme"
      description="Color scheme for the application"
      control={<span className="text-sm text-zinc-500">Dark mode only</span>}
    />
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────

const SECTION_TITLES: Record<string, string> = {
  general: 'General',
  terminal: 'Terminal',
  editor: 'Editor',
  appearance: 'Appearance',
}

export function SettingsContent() {
  const { activeSection } = useSettingsStore()

  return (
    <div className="flex-1 bg-zinc-900 h-full overflow-y-auto px-12 py-10 min-w-0">
      <h1 className="text-xl font-semibold text-zinc-100 mb-8">
        {SECTION_TITLES[activeSection]}
      </h1>

      {activeSection === 'general' && <GeneralSection />}
      {activeSection === 'terminal' && <TerminalSection />}
      {activeSection === 'editor' && <EditorSection />}
      {activeSection === 'appearance' && <AppearanceSection />}
    </div>
  )
}
