import { useState, useRef, useEffect, useMemo } from 'react'
import {
  Check,
  Code, Terminal, Globe, Folder, GitBranch, Database, Cloud, Lightning,
  Rocket, Flask, Atom, Cpu, Package, Wrench, Palette, GameController,
  BookOpen, ChartBar, Lock, Robot, Broadcast, Star, Heart, Diamond,
  Leaf, Fire, Snowflake, Sun, Moon, Camera, MusicNote, Video, Microphone,
  MagnifyingGlass, Bug, Compass, MapPin, Fingerprint, Key, Shield,
  Hexagon, Triangle, Circle, Square, Note, Smiley, Alien, Cat, Dog,
  Fish, Bird, Butterfly, Flower, Tree,
} from '@phosphor-icons/react'
import { useSettingsStore, ColorMode } from '../../stores/settings-store'
import { useProjectStore, useActiveProject, ProjectLayout } from '../../stores/project-store'
import { PALETTES, PALETTE_KEYS, PaletteKey, getPaletteHex } from '../../lib/palettes'
import { monogram } from '../../lib/colors'

// ── Icon picker ───────────────────────────────────────────────────────────────

type IconEntry = { name: string; component: React.ElementType; keywords: string }

const ICON_LIST: IconEntry[] = [
  { name: 'Code',          component: Code,           keywords: 'code dev' },
  { name: 'Terminal',      component: Terminal,        keywords: 'terminal shell cli' },
  { name: 'Globe',         component: Globe,           keywords: 'web browser internet' },
  { name: 'Folder',        component: Folder,          keywords: 'folder files' },
  { name: 'GitBranch',     component: GitBranch,       keywords: 'git branch version' },
  { name: 'Database',      component: Database,        keywords: 'database db sql' },
  { name: 'Cloud',         component: Cloud,           keywords: 'cloud deploy server' },
  { name: 'Lightning',     component: Lightning,       keywords: 'lightning fast api' },
  { name: 'Rocket',        component: Rocket,          keywords: 'rocket launch deploy' },
  { name: 'Flask',         component: Flask,           keywords: 'flask test experiment' },
  { name: 'Atom',          component: Atom,            keywords: 'atom react science' },
  { name: 'Cpu',           component: Cpu,             keywords: 'cpu processor hardware' },
  { name: 'Package',       component: Package,         keywords: 'package npm library' },
  { name: 'Wrench',        component: Wrench,          keywords: 'wrench tool settings' },
  { name: 'Palette',       component: Palette,         keywords: 'palette design color' },
  { name: 'GameController',component: GameController,  keywords: 'game controller' },
  { name: 'BookOpen',      component: BookOpen,        keywords: 'book docs documentation' },
  { name: 'ChartBar',      component: ChartBar,        keywords: 'chart graph analytics data' },
  { name: 'Lock',          component: Lock,            keywords: 'lock security auth' },
  { name: 'Robot',         component: Robot,           keywords: 'robot ai agent bot' },
  { name: 'Broadcast',     component: Broadcast,       keywords: 'broadcast stream signal' },
  { name: 'Star',          component: Star,            keywords: 'star favorite' },
  { name: 'Heart',         component: Heart,           keywords: 'heart love' },
  { name: 'Diamond',       component: Diamond,         keywords: 'diamond gem' },
  { name: 'Leaf',          component: Leaf,            keywords: 'leaf nature green eco' },
  { name: 'Fire',          component: Fire,            keywords: 'fire hot' },
  { name: 'Snowflake',     component: Snowflake,       keywords: 'snowflake cold' },
  { name: 'Sun',           component: Sun,             keywords: 'sun light day' },
  { name: 'Moon',          component: Moon,            keywords: 'moon night dark' },
  { name: 'Camera',        component: Camera,          keywords: 'camera photo image' },
  { name: 'MusicNote',     component: MusicNote,       keywords: 'music audio sound note' },
  { name: 'Video',         component: Video,           keywords: 'video film media' },
  { name: 'Microphone',    component: Microphone,      keywords: 'mic audio voice' },
  { name: 'MagnifyingGlass', component: MagnifyingGlass, keywords: 'search find' },
  { name: 'Bug',           component: Bug,             keywords: 'bug debug error' },
  { name: 'Compass',       component: Compass,         keywords: 'compass navigate direction' },
  { name: 'MapPin',        component: MapPin,          keywords: 'map pin location geo' },
  { name: 'Fingerprint',   component: Fingerprint,     keywords: 'fingerprint identity auth' },
  { name: 'Key',           component: Key,             keywords: 'key access secret' },
  { name: 'Shield',        component: Shield,          keywords: 'shield protect security' },
  { name: 'Hexagon',       component: Hexagon,         keywords: 'hexagon shape' },
  { name: 'Triangle',      component: Triangle,        keywords: 'triangle shape' },
  { name: 'Circle',        component: Circle,          keywords: 'circle shape dot' },
  { name: 'Square',        component: Square,          keywords: 'square shape' },
  { name: 'Note',          component: Note,            keywords: 'note text memo' },
  { name: 'Smiley',        component: Smiley,          keywords: 'smiley emoji face' },
  { name: 'Alien',         component: Alien,           keywords: 'alien space' },
  { name: 'Cat',           component: Cat,             keywords: 'cat animal' },
  { name: 'Dog',           component: Dog,             keywords: 'dog animal' },
  { name: 'Fish',          component: Fish,            keywords: 'fish animal' },
  { name: 'Bird',          component: Bird,            keywords: 'bird animal' },
  { name: 'Butterfly',     component: Butterfly,       keywords: 'butterfly insect' },
  { name: 'Flower',        component: Flower,          keywords: 'flower plant nature' },
  { name: 'Tree',          component: Tree,            keywords: 'tree plant nature' },
]

function IconPicker({
  value,
  faviconUrl,
  onSelect,
  accent,
  projectPath,
  projectName,
}: {
  value: string
  faviconUrl: string | null
  onSelect: (icon: string, faviconUrl: string | null) => void
  accent: string
  projectPath: string
  projectName: string
}) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'icons' | 'favicon'>('icons')
  const [query, setQuery] = useState('')
  const [detectedFavicon, setDetectedFavicon] = useState<string | null>(null)
  const [probing, setProbing] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Probe for favicon when tab is shown
  useEffect(() => {
    if (tab !== 'favicon' || !open) return
    setProbing(true)
    window.electron.findFavicon(projectPath).then((result) => {
      setDetectedFavicon(result)
      setProbing(false)
    })
  }, [tab, open, projectPath])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return ICON_LIST
    return ICON_LIST.filter(
      (e) => e.name.toLowerCase().includes(q) || e.keywords.includes(q)
    )
  }, [query])

  // Resolve what the trigger button shows
  const isFavicon = value === 'favicon' && faviconUrl
  const iconName = !isFavicon && value !== 'auto' && value !== 'favicon' ? value : null
  const SelectedIcon = iconName ? ICON_LIST.find((e) => e.name === iconName)?.component : null
  const mono = monogram(projectName)

  return (
    <div className="relative shrink-0" ref={popoverRef}>
      {/* Trigger — large icon button */}
      <button
        onClick={() => { setOpen((v) => !v); setQuery('') }}
        className="w-11 h-11 rounded-xl flex items-center justify-center border transition-colors hover:brightness-125"
        style={{
          backgroundColor: `${accent}18`,
          borderColor: `${accent}35`,
        }}
      >
        {isFavicon ? (
          <img src={faviconUrl!} alt="" className="w-5 h-5 object-contain" />
        ) : SelectedIcon ? (
          <SelectedIcon size={20} weight="regular" style={{ color: accent }} />
        ) : (
          <span className="text-sm font-bold font-mono leading-none" style={{ color: accent }}>
            {mono}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 bg-panel border border-edge rounded-xl shadow-2xl w-72 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-edge">
            <button
              onClick={() => setTab('icons')}
              className={`flex-1 text-xs py-2.5 font-medium transition-colors ${
                tab === 'icons' ? 'text-t1 shadow-[inset_0_-1px_0_var(--text-t1)]' : 'text-t3 hover:text-t2'
              }`}
            >
              Icons
            </button>
            <button
              onClick={() => setTab('favicon')}
              className={`flex-1 text-xs py-2.5 font-medium transition-colors ${
                tab === 'favicon' ? 'text-t1 shadow-[inset_0_-1px_0_var(--text-t1)]' : 'text-t3 hover:text-t2'
              }`}
            >
              Favicon
            </button>
          </div>

          {tab === 'icons' && (
            <>
              <div className="p-2 border-b border-edge">
                <div className="relative">
                  <MagnifyingGlass size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-t4" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search icons…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full bg-overlay text-t1 text-xs rounded px-2.5 py-1.5 pl-7 outline-none placeholder:text-t4"
                  />
                </div>
              </div>
              <div className="grid grid-cols-9 gap-0.5 p-2 max-h-56 overflow-y-auto">
                {!query && (
                  <button
                    onClick={() => { onSelect('auto', null); setOpen(false) }}
                    title="Auto (monogram)"
                    className={`flex items-center justify-center w-full aspect-square rounded text-[10px] font-bold transition-colors ${
                      value === 'auto' ? 'bg-overlay text-t1' : 'text-t3 hover:bg-overlay hover:text-t1'
                    }`}
                  >
                    Ab
                  </button>
                )}
                {filtered.map((entry) => {
                  const Icon = entry.component
                  const isActive = value === entry.name
                  return (
                    <button
                      key={entry.name}
                      onClick={() => { onSelect(entry.name, null); setOpen(false) }}
                      title={entry.name}
                      className={`flex items-center justify-center w-full aspect-square rounded transition-colors ${
                        isActive ? 'bg-overlay text-t1' : 'text-t3 hover:bg-overlay hover:text-t1'
                      }`}
                      style={isActive ? { color: accent } : undefined}
                    >
                      <Icon size={15} weight="regular" />
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {tab === 'favicon' && (
            <div className="p-4 flex flex-col items-center gap-3 min-h-[120px] justify-center">
              {probing ? (
                <p className="text-xs text-t3">Searching for favicon…</p>
              ) : detectedFavicon ? (
                <>
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center border"
                    style={{ backgroundColor: `${accent}18`, borderColor: `${accent}35` }}
                  >
                    <img src={detectedFavicon} alt="Favicon" className="w-8 h-8 object-contain" />
                  </div>
                  <p className="text-xs text-t2">Favicon found in your project</p>
                  <button
                    onClick={() => { onSelect('favicon', detectedFavicon); setOpen(false) }}
                    className="text-xs font-medium px-3 py-1.5 rounded transition-colors text-t1 hover:brightness-125"
                    style={{ backgroundColor: `${accent}30` }}
                  >
                    Use this favicon
                  </button>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-lg bg-overlay flex items-center justify-center">
                    <span className="text-sm font-bold font-mono text-t3">{monogram(projectName)}</span>
                  </div>
                  <p className="text-xs text-t2">No favicon detected</p>
                  <p className="text-[11px] text-t4 text-center leading-relaxed max-w-[220px]">
                    Glyph looks for favicons in your repo at common paths like{' '}
                    <span className="text-t3">public/favicon.svg</span>,{' '}
                    <span className="text-t3">app/favicon.ico</span>, and similar locations.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

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
        <div className="text-sm font-medium text-t2">{label}</div>
        <div className="text-xs text-t4 mt-0.5">{description}</div>
      </div>
      {control}
    </div>
  )
}

// ── Sections ──────────────────────────────────────────────────────────────────

function GeneralSection() {
  const { autoOpenTerminal, showHiddenFiles, confirmDelete } = useSettingsStore()
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
      <SettingRow
        label="Confirm before delete"
        description="Show a warning when deleting files from the file tree"
        control={
          <Toggle
            value={confirmDelete}
            onChange={(v) => set({ confirmDelete: v })}
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

const LAYOUTS: { value: ProjectLayout; label: string; description: string }[] = [
  { value: 'vertical',   label: 'Vertical',   description: 'Terminal on the right' },
  { value: 'horizontal', label: 'Horizontal', description: 'Terminal on the bottom' },
]

function AppearanceSection() {
  const { colorMode } = useSettingsStore()
  const set = useSettingsStore.setState
  const activeProject = useActiveProject()
  const { setProjectLayout } = useProjectStore()

  return (
    <>
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
      {activeProject && (
        <SettingRow
          label="Layout"
          description="Arrangement of the editor and terminal for this project"
          control={
            <div className="flex gap-1.5">
              {LAYOUTS.map((layout) => (
                <button
                  key={layout.value}
                  onClick={() => setProjectLayout(activeProject.id, layout.value)}
                  title={layout.description}
                  className={`px-3 py-1.5 text-xs rounded transition-colors ${
                    (activeProject.layout ?? 'vertical') === layout.value
                      ? 'bg-overlay text-t1'
                      : 'text-t3 hover:text-t2 hover:bg-overlay-50'
                  }`}
                >
                  {layout.label}
                </button>
              ))}
            </div>
          }
        />
      )}
    </>
  )
}

function ProjectSection({ projectId }: { projectId: string }) {
  const { projects, removeProject, updateProject } = useProjectStore()
  const { closeSettings } = useSettingsStore()
  const project = projects.find((p) => p.id === projectId)

  const [devCommand, setDevCommand] = useState(project?.devCommand ?? '')

  if (!project) {
    return <p className="text-sm text-t3">Project not found.</p>
  }

  const accent = getPaletteHex(project.palette)

  const handleRemove = () => {
    removeProject(projectId)
    closeSettings()
  }

  const handleIconSelect = (icon: string, faviconUrl: string | null) => {
    updateProject(projectId, { icon, faviconUrl })
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
      {/* Header: Icon + Name */}
      <div className="flex items-center gap-4 pb-6 mb-2 border-b border-edge-60">
        <IconPicker
          value={project.icon ?? 'auto'}
          faviconUrl={project.faviconUrl}
          onSelect={handleIconSelect}
          accent={accent}
          projectPath={project.path}
          projectName={project.name}
        />
        <span className="text-t1 text-lg font-semibold truncate">{project.name}</span>
      </div>

      {/* Folder path */}
      <div className="flex items-center justify-between py-4 border-b border-edge-60">
        <div>
          <div className="text-xs font-medium text-t2">Folder</div>
          <div className="text-xs text-t4 mt-0.5">Project location on disk</div>
        </div>
        <span className="text-sm text-t2 truncate max-w-[60%]" title={project.path}>{project.path}</span>
      </div>

      {/* Dev command */}
      <div className="flex items-center justify-between py-4 border-b border-edge-60">
        <div>
          <div className="text-xs font-medium text-t2">Dev command</div>
          <div className="text-xs text-t4 mt-0.5">Command to start the dev server</div>
        </div>
        <input
          type="text"
          value={devCommand}
          onChange={(e) => setDevCommand(e.target.value)}
          onBlur={() => updateProject(projectId, { devCommand: devCommand.trim() || null })}
          placeholder="e.g. pnpm dev"
          className="selectable appearance-none bg-overlay text-t1 text-sm rounded px-3 py-1.5 outline-none focus:ring-1 focus:ring-edge w-48 placeholder:text-t4"
        />
      </div>

      {/* Port */}
      <div className="flex items-center justify-between py-4 border-b border-edge-60">
        <div>
          <div className="text-xs font-medium text-t2">Port</div>
          <div className="text-xs text-t4 mt-0.5">Dev server port</div>
        </div>
        <span className="text-sm text-t2">{project.port}</span>
      </div>

      {/* Color palette */}
      <div className="flex items-center justify-between py-4 border-b border-edge-60">
        <div>
          <div className="text-xs font-medium text-t2">Color</div>
          <div className="text-xs text-t4 mt-0.5">Accent color for this project</div>
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
        {activeSection !== 'project' && (
          <h1 className="text-xl font-semibold text-t1 mb-8">
            {SECTION_TITLES[activeSection]}
          </h1>
        )}

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
