# Glyph — Product Requirements Document v2

## One-liner

A standalone Electron app with three panels — sidebar, browser, terminal — designed for solo developers who build with AI coding agents.

## Core promise

*"I moved impossibly fast."*

## Why this exists

Solo developers using AI agents (Claude Code, Codex, etc.) are juggling multiple Cursor windows, browser tabs for localhost previews, and scattered terminal sessions. The cognitive overhead isn't writing code — it's managing the environment around the code. Glyph consolidates everything into one calm workspace where switching between projects is instant and the browser preview is always live.

## Target user

Solo developers and vibe coders who use AI coding agents as their primary way of building software. They think in terms of projects and outcomes, not files and commits.

## Brand

Calm, elegant, Sonos-like. Delight that whispers, never shouts.

---

## Architecture

Glyph is a standalone Electron app built from scratch with React, shadcn/ui, and Tailwind CSS. No VS Code fork. The four core capabilities come from standalone packages:

| Capability | Package | Notes |
|---|---|---|
| Code editor | `monaco-editor` | Same editor as VS Code, standalone |
| Terminal | `xterm.js` + `node-pty` | Same terminal as VS Code, standalone |
| Browser | Electron `BrowserView` | Chromium webview, built into Electron |
| UI | React + shadcn + Tailwind | Full design control |

### Why not a VS Code fork

- VS Code's UI is vanilla TypeScript with direct DOM manipulation — not React. Reskinning it means fighting the framework instead of building the product.
- 90% of VS Code's codebase is features Glyph doesn't need (extensions marketplace, source control, debug panel, settings sync, remote development, etc.).
- Conductor, the closest comp, is a standalone Electron app and shipped faster because of it.
- A clean Electron app gives full control over layout, theming, transitions, and brand from line one.

---

## Layout

```
┌──────────┬─────────────────────────────────────────────────────┐
│          │ ┌─────────────────────┬───────────────────────────┐ │
│          │ │                     │                           │ │
│ Sidebar  │ │   Editor / Browser  │       Terminal            │ │
│          │ │                     │                           │ │
│ 240px    │ │   (tabs: code files │  (Claude Code, shell,     │ │
│ fixed    │ │    OR localhost)     │   Codex, etc.)            │ │
│          │ │                     │                           │ │
│          │ │                     │                           │ │
│          │ └─────────────────────┴───────────────────────────┘ │
└──────────┴─────────────────────────────────────────────────────┘
```

- **Sidebar** (left, 240px, resizable): Project list + file explorer for selected project.
- **Editor / Browser** (center): Tabbed panel. Tabs can be code files (Monaco) or the browser panel (BrowserView). Horizontal split is adjustable.
- **Terminal** (right): One or more terminal instances per project. Draggable divider between editor and terminal.

The center and right panels are a resizable split. The user can drag the divider to give more room to the browser or the terminal depending on how they work.

---

## MVP Features

### 1. Project sidebar

A vertical list of projects. Each project is a folder on the user's filesystem.

**Project icon:**
- Default: first letter of the folder name, monospace, centered in a rounded square with a colored background.
- If two projects share a first letter, use first two letters (**PA** vs **PL**).
- If a favicon is found in the project (`/public/favicon.ico`, `/public/favicon.png`, `/src/app/favicon.ico`, root `favicon.ico`), use it instead.
- Color is auto-assigned from a curated palette of 8-10 warm, muted tones designed to be visually distinct from each other.

**Project settings (per project):**
- Workspace color (tints the icon and subtle UI accents)
- Custom icon (override auto-generated)
- Display name (defaults to folder name)
- Assigned port (auto-managed, overridable)

**Sidebar behavior:**
- Clicking a project switches the entire workspace (editor/browser + terminal).
- Currently selected project has a subtle highlight.
- Drag and drop to reorder.
- Right-click context menu: settings, reveal in Finder, remove from Glyph.

**File explorer:**
- Below the project list, a collapsible file tree for the selected project.
- Clicking a file opens it as a tab in the editor panel (Monaco).
- Standard file operations: rename, delete, new file, new folder.
- Use a recursive directory read (`fs.readdir`) with a file watcher (`chokidar`) to keep the tree in sync as agents create/modify files.

**Contextual accent color:**
- The app has no fixed brand accent color. Instead, the selected project's color subtly tints interactive elements: active tab underline, terminal cursor, focused borders, scrollbar thumb.
- When you switch projects, the accent shifts to that project's color.
- System-level UI (start screen, settings) uses warm neutral tones with no accent.

### 2. Editor / Browser panel

A tabbed panel where each tab is either a code file (Monaco editor) or the browser preview (BrowserView).

**Code editor tabs:**
- Powered by Monaco Editor (`monaco-editor` npm package).
- Syntax highlighting, bracket matching, minimap (optional), find/replace.
- Multiple files can be open as tabs simultaneously.
- Modified files show a dot indicator on the tab.
- Files are editable by both the user and the agent (agent writes to disk, `chokidar` detects the change, Monaco reloads the buffer).

**Browser tab:**
- An Electron `BrowserView` that loads `localhost:{port}` for the selected project.
- Minimal toolbar: URL bar (editable), back, forward, refresh.
- Browser toolbar dropdown actions: take screenshot, hard reload, copy URL, zoom, clear cache.
- If the dev server isn't running yet, show a calm empty state: globe icon and muted text *"Starting dev server..."*
- When the dev server is running and HMR is active, the preview updates in real time.
- The browser tab is labeled "Preview" with a globe icon, always pinned as the first tab.

**Tab behavior:**
- When a project is first selected with no open files, the browser tab is focused.
- Opening a file from the file explorer adds a new tab. Clicking the browser tab returns to the preview.
- Tab state (which files are open, which is focused) is stored per project and restored on switch.

### 3. Terminal panel

Powered by `xterm.js` for rendering and `node-pty` for spawning pseudo-terminals.

**New terminal dropdown:**
When clicking the `+` button in the terminal panel header, a dropdown appears:
- **Claude Code** — spawns `claude` in the project directory (default, listed first)
- **Codex** — spawns `codex` in the project directory
- **Shell** — spawns the user's default shell in the project directory
- Separator
- **Configure agents...** → opens settings to add/remove/reorder agent options

**Default behavior:**
- When a project is first added, Glyph opens one Claude Code terminal automatically.
- Multiple terminals per project are supported as tabs within the terminal panel.
- Each terminal tab shows a label: the agent name or "shell", with a colored dot matching the agent type.

**Terminal state persistence:**
- Switching projects preserves terminal state completely: scroll position, running processes, command history.
- Switching back restores the terminal exactly as you left it.

**Terminal theming:**
- Background matches Glyph's base dark color (warm, not cold).
- Cursor color matches the project's accent color.
- Font: JetBrains Mono or Berkeley Mono, 14px, line-height 1.4.
- Slightly more generous than typical terminal defaults — calm, not dense.

### 4. Port management

Fully managed by Glyph. The user never thinks about port numbers.

**Auto-assignment:**
- First project: port 3000. Second: 3001. Third: 3002.
- On assignment, Glyph probes the port (`net.createServer`) to verify it's free. If occupied by a non-Glyph process, skip to the next.
- Assignments are stored in `~/.glyph/projects.json` and persist across sessions.

**Dev server auto-start:**
- When a project is selected, Glyph checks if a dev server is already running on the assigned port.
- If not, Glyph detects the framework and starts the dev server in a background child process (not visible in the user's terminal panel):

```
Detection priority:
  1. Stored devCommand in projects.json (user override)
  2. package.json scripts:
     - "dev" script exists → npm run dev -- --port {port}
     - "start" script exists → PORT={port} npm start
  3. Framework-specific config files:
     - next.config.* → npx next dev -p {port}
     - vite.config.* → npx vite --port {port}
     - angular.json → npx ng serve --port {port}
     - remix.config.* → PORT={port} npx remix dev
  4. Python projects:
     - manage.py → python manage.py runserver {port}
  5. No match → do nothing, user starts manually
```

- The dev server process is managed by Glyph and killed when the project is removed or Glyph quits.

**Port display:**
- Sidebar: port shown subtly below the project name in muted text (`localhost:3001`).
- Browser toolbar: full URL in the URL bar.

### 5. Project context switching

When a user clicks a different project in the sidebar:

1. Editor panel switches to that project's open tabs (or browser preview if no files open).
2. Terminal panel switches to that project's terminal instances.
3. Browser panel navigates to that project's localhost port.
4. UI accent color shifts to that project's color.
5. File explorer updates to show that project's file tree.

All state from the previous project is preserved in memory. Switching back restores everything exactly — open files, scroll positions, terminal state, browser URL.

Target: context switch should complete in under 100ms. No loading screens.

### 6. Start screen

Shown when Glyph opens with no projects. Replaces the three-panel layout with a centered welcome view.

**Layout:**
- Full-width centered content, no sidebar.
- Glyph wordmark at top. Light weight, large, understated.
- Three action cards in a horizontal row below:

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  📁              │  │  🌐              │  │  ⚡              │
│                  │  │                  │  │                  │
│                  │  │                  │  │                  │
│  Open project    │  │  Clone from URL  │  │  Quick start     │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

- **Open project**: native file picker → select folder → added to sidebar.
- **Clone from URL**: text input for Git URL → Glyph clones to `~/Projects/{repo-name}` → added to sidebar.
- **Quick start**: text input for project name, optional framework template dropdown (Next.js, Vite, plain HTML) → Glyph scaffolds in `~/Projects/{name}` → added to sidebar with Claude Code ready to go.

- Cards use shadcn Card component, subtle borders, generous padding. Icons are Phosphor `light` weight at 32px: `FolderOpen` for Open project, `Globe` for Clone from URL, `Lightning` for Quick start.
- After first project is added, the three-panel layout appears. Start screen is accessible again via `File → New Window` or when all projects are removed.

---

## Design system

### Color: Tailwind Zinc

Use Tailwind's `zinc` scale as the entire base palette. Zinc is a neutral gray with a subtle warm undertone — it reads as warm-dark without being brown. No custom HSL values needed.

**Dark mode mapping:**
```
App background:     zinc-950    (#09090b)
Panel surfaces:     zinc-900    (#18181b)
Cards, hover:       zinc-800    (#27272a)
Dropdowns, modals:  zinc-700    (#3f3f46)

Text primary:       zinc-50     (#fafafa)
Text secondary:     zinc-400    (#a1a1aa)
Text tertiary:      zinc-500    (#71717a)

Border subtle:      zinc-800    (#27272a)     /* panel separators */
Border default:     zinc-700    (#3f3f46)     /* cards, inputs */
Border strong:      zinc-600    (#52525b)     /* focus, hover */
```

This maps directly to shadcn's dark theme tokens. When configuring shadcn, set `zinc` as the base color — all components inherit the right values automatically.

**Project accent palette (auto-assigned):**
```
Teal:    hsl(160, 50%, 45%)
Coral:   hsl(15, 70%, 55%)
Amber:   hsl(35, 80%, 55%)
Violet:  hsl(260, 45%, 60%)
Sky:     hsl(200, 60%, 55%)
Rose:    hsl(340, 50%, 55%)
Lime:    hsl(90, 50%, 50%)
Slate:   hsl(210, 15%, 55%)
```

These are the only custom colors in the app. Everything else is zinc.

### Typography: Open Runde

[Open Runde](https://github.com/lauridskern/open-runde) is a soft, rounded variant of Inter. It gives the UI a friendly, approachable warmth while staying clean and professional. OFL-1.1 licensed.

```
--font-sans:  'Open Runde', -apple-system, sans-serif    /* all UI text */
--font-mono:  'JetBrains Mono', 'SF Mono', monospace      /* terminal, code, project icons */
```

Available weights: Regular (400), Medium (500), Semi Bold (600), Bold (700).

Bundle the font files directly in the Electron app (`src/assets/fonts/`). Register via `@font-face` in globals.css. Do not load from a CDN — Electron apps should be self-contained.

**Sizing:**
- Sidebar project names: 13px, weight 500
- File explorer: 12px, weight 400
- Tab labels: 12px, weight 400
- Terminal: 14px, line-height 1.4 (JetBrains Mono, not Open Runde)
- Start screen wordmark: 48px, weight 400

The rounded terminals on Open Runde's letterforms pair naturally with rounded UI corners. The whole app will feel cohesive without trying.

### Icons: Phosphor Icons

Use [Phosphor Icons](https://phosphoricons.com/) via `@phosphor-icons/react`. Phosphor has a consistent design language, multiple weights (thin, light, regular, bold, fill, duotone), and 1,000+ icons.

**Weight convention:**
- UI chrome (sidebar, toolbar, tabs): `regular` weight
- Empty states and start screen cards: `light` weight at 32px
- Active/selected states: `fill` weight
- Never mix weights within the same visual group

**Icon sizing:**
- Inline icons (tabs, buttons, menus): 16px
- Sidebar file explorer icons: 14px
- Start screen card icons: 32px
- Empty state illustrations: 48px

### Borders and separation

- Panel dividers: 1px `zinc-800`. Barely visible against `zinc-900` surfaces.
- No hard borders between sidebar and editor, or editor and terminal. The background step from `zinc-950` (sidebar) to `zinc-900` (panels) provides enough separation.
- Cards and inputs: 1px `zinc-700`.
- Focus rings: `ring-zinc-600` with 1px offset.

### Corners

- Cards, dropdowns, modals: 8px radius (`rounded-lg`)
- Inputs, buttons: 6px radius (`rounded-md`)
- Project icons: 8px radius (`rounded-lg`)
- Tabs: 4px radius top only

### Transitions

- Project switch (editor + terminal crossfade): 150ms ease-out
- Sidebar highlight: 100ms ease
- Tab switch: instant (no animation)
- New project added to sidebar: 200ms slide-in from top with fade
- Dropdown open: 100ms ease-out with 4px upward drift

---

## Tech stack

```
Runtime:        Electron (latest stable)
UI framework:   React 18+
UI components:  shadcn/ui (zinc base color)
Styling:        Tailwind CSS
Icons:          @phosphor-icons/react
Font (UI):      Open Runde (bundled, 4 weights: 400/500/600/700)
Font (code):    JetBrains Mono (bundled)
Code editor:    monaco-editor
Terminal:       xterm.js + @xterm/addon-fit + @xterm/addon-webgl
PTY:            node-pty (native module, spawns shell/agent processes)
File watching:   chokidar
State:          zustand (lightweight, no boilerplate)
Build:          Vite + electron-builder (or electron-vite)
Config storage: JSON files in ~/.glyph/
```

### Project structure

```
glyph/
├── electron/
│   ├── main.ts              # Electron main process
│   ├── preload.ts            # Preload script for IPC
│   ├── services/
│   │   ├── port-manager.ts   # Port assignment + probing
│   │   ├── dev-server.ts     # Framework detection + process spawning
│   │   ├── project-store.ts  # Read/write ~/.glyph/projects.json
│   │   └── pty-manager.ts    # Spawn and manage terminal processes
│   └── ipc/
│       └── handlers.ts       # IPC message handlers
├── src/
│   ├── App.tsx               # Root component, layout router
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── EditorPanel.tsx
│   │   │   ├── TerminalPanel.tsx
│   │   │   ├── BrowserPanel.tsx
│   │   │   └── PanelDivider.tsx
│   │   ├── sidebar/
│   │   │   ├── ProjectList.tsx
│   │   │   ├── ProjectItem.tsx
│   │   │   ├── FileExplorer.tsx
│   │   │   └── ProjectSettings.tsx
│   │   ├── editor/
│   │   │   ├── MonacoEditor.tsx
│   │   │   └── TabBar.tsx
│   │   ├── terminal/
│   │   │   ├── Terminal.tsx
│   │   │   ├── TerminalTabs.tsx
│   │   │   └── AgentSelector.tsx
│   │   ├── browser/
│   │   │   ├── BrowserToolbar.tsx
│   │   │   └── BrowserEmptyState.tsx
│   │   └── start/
│   │       ├── StartScreen.tsx
│   │       └── ActionCard.tsx
│   ├── stores/
│   │   ├── project-store.ts  # Zustand store for projects
│   │   ├── editor-store.ts   # Open tabs, active file per project
│   │   └── terminal-store.ts # Terminal instances per project
│   ├── hooks/
│   │   ├── useProject.ts
│   │   ├── useTerminal.ts
│   │   └── usePort.ts
│   ├── lib/
│   │   ├── colors.ts         # Project color palette + assignment
│   │   ├── favicon.ts        # Favicon detection logic
│   │   └── framework.ts      # Framework detection for dev server
│   ├── assets/
│   │   └── fonts/
│   │       ├── OpenRunde-Regular.woff2
│   │       ├── OpenRunde-Medium.woff2
│   │       ├── OpenRunde-SemiBold.woff2
│   │       ├── OpenRunde-Bold.woff2
│   │       ├── JetBrainsMono-Regular.woff2
│   │       └── JetBrainsMono-Medium.woff2
│   └── styles/
│       └── globals.css        # Tailwind + CSS variables
├── package.json
├── electron-builder.yml
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

### IPC architecture

The Electron main process handles all system operations. The renderer (React) communicates via IPC:

```
Renderer → Main:
  project:add          { path: string }
  project:remove       { id: string }
  project:select       { id: string }
  terminal:create      { projectId: string, type: 'shell' | 'claude' | 'codex' }
  terminal:write       { terminalId: string, data: string }
  terminal:resize      { terminalId: string, cols: number, rows: number }
  devserver:start      { projectId: string }
  devserver:stop       { projectId: string }
  file:read            { path: string }
  file:write           { path: string, content: string }
  dialog:openFolder    {}
  git:clone            { url: string, dest: string }

Main → Renderer:
  terminal:data        { terminalId: string, data: string }
  devserver:status     { projectId: string, status: 'starting' | 'running' | 'stopped' | 'error' }
  file:changed         { path: string }
  port:assigned        { projectId: string, port: number }
```

### BrowserView management

The browser panel uses Electron's `BrowserView` (not a webview tag) for better performance and security.

```
- One BrowserView per project, created lazily on first select.
- BrowserViews are attached/detached from the window on project switch (not destroyed).
- Bounds are recalculated on window resize and panel divider drag.
- Each BrowserView loads localhost:{assignedPort} for its project.
- A transparent overlay div in the React UI handles the toolbar; the BrowserView sits beneath it.
```

---

## Delight details (ships with MVP)

**Project icons:**
- First-letter icons rendered with the mono font at 16px, centered in a 32x32 rounded square.
- Auto-assigned colors from the curated palette, chosen to maximize visual distance from existing project colors.
- Favicon detection checks common paths on project add and falls back to first-letter.

**Contextual accent:**
- On project switch, the accent color transitions (200ms ease) rather than snapping. Feels organic.
- Accent tints: active tab underline, terminal cursor, sidebar selection indicator, browser URL bar focus ring.

**Transitions:**
- Project switch: editor and terminal crossfade (150ms). Never a hard cut.
- New project: sidebar item slides in with subtle fade + drift.

**Empty states:**
- Browser before dev server: centered globe icon, muted text, warm. Never a raw error or white page.
- Terminal before input: show agent branding (logo, version, project path) as the CLI does natively.
- No projects: start screen with the three action cards.

**Sound (optional, off by default):**
- Settings toggle: "Interface sounds"
- If on: subtle tone when dev server starts, soft chime when an agent finishes a task.

---

## Config storage

All Glyph state lives in `~/.glyph/`:

```
~/.glyph/
├── projects.json        # Project list + settings
├── state.json           # Window size, panel widths, last selected project
└── settings.json        # Global preferences (default agent, sounds, etc.)
```

**projects.json:**
```json
{
  "projects": [
    {
      "id": "a1b2c3",
      "name": "landing-page",
      "path": "/Users/charles/Projects/landing-page",
      "port": 3000,
      "color": "#5DCAA5",
      "icon": "auto",
      "devCommand": null,
      "openFiles": ["src/App.tsx", "src/index.css"],
      "activeFile": "src/App.tsx",
      "terminals": [
        { "id": "t1", "type": "claude", "label": "Claude Code" }
      ]
    }
  ]
}
```

**state.json:**
```json
{
  "windowBounds": { "x": 100, "y": 100, "width": 1440, "height": 900 },
  "sidebarWidth": 240,
  "editorTerminalSplit": 0.55,
  "activeProjectId": "a1b2c3"
}
```

---

## Out of scope for MVP

- Parallel agent orchestration (Conductor-style multi-agent per project)
- Git integration / branch management / PR creation
- Screenshot-to-code (drop image → agent builds it)
- Visual annotation on browser preview
- Skills / recipe library
- Deployment / shipping
- Morning briefings / status summaries
- Time-saved tracking / streak counters
- Custom sound design (beyond on/off toggle)
- Settings sync across machines
- Team / collaboration features
- Extension / plugin system
- Auto-update mechanism (manual download for v1)
- Light mode (dark only for MVP)

---

## Success criteria

1. A user can add 3 projects, switch between them instantly, and have the browser + terminal match each project without manual configuration.
2. Port management is invisible — the user never assigns or remembers a port.
3. The start screen makes a new user productive in under 60 seconds.
4. Context switching between projects completes in under 100ms.
5. The app feels calm, warm, and intentional — not like a hacked-together IDE.

---

## Build sequence

Suggested order to build, each step producing a usable increment:

1. **Electron shell + React + Tailwind** — empty window with the three-panel layout and resizable dividers.
2. **Start screen** — the three action cards, "Open project" wired to native file picker.
3. **Project sidebar** — add/remove/select projects, first-letter icons, color assignment.
4. **Terminal panel** — xterm.js + node-pty, spawn a shell in the project directory. Verify switching terminals on project switch.
5. **Agent selector** — dropdown on `+` button to choose Claude Code / Codex / shell.
6. **Port manager + dev server** — auto-assign ports, detect framework, start dev server in background.
7. **Browser panel** — BrowserView loading localhost:{port}, toolbar, empty state.
8. **File explorer** — recursive dir read, chokidar watcher, click to open in editor.
9. **Monaco editor** — open files as tabs, syntax highlighting, file watching for agent-driven changes.
10. **Project settings** — color picker, icon override, display name, port override.
11. **Polish** — transitions, contextual accent color, favicon detection, sound toggle.

---

## Open questions

1. **Naming**: Glyph is the working name. Final decision pending.
2. **Agent configuration**: How much control over model/version? Defer to agent CLIs for now.
3. **Multiple repos per project**: One project = one folder for MVP.
4. **Pricing**: Free? Freemium? Subscription? Decide before launch.
5. **BrowserView vs webview tag**: BrowserView is more performant but has lifecycle quirks in Electron. May need to evaluate `webContentsView` in newer Electron versions.
6. **Monaco vs CodeMirror**: Monaco is heavier but feature-complete. CodeMirror 6 is lighter and more customizable. Worth evaluating if bundle size becomes an issue.
