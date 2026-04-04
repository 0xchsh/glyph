# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Glyph is a standalone Electron app (React + Tailwind + shadcn) — a 3-panel workspace for solo developers using AI coding agents. Layout: **Sidebar (projects + files + ports) | Editor/Browser (Monaco + BrowserView) | Terminal (xterm.js + node-pty)**.

## Commands

**Requires Node 22** — switch with `fnm use 22`.

```bash
# Install
pnpm install

# Dev (launches Electron with HMR)
pnpm dev

# Build
pnpm build

# Package (creates distributable)
pnpm package
```

## Architecture

### Process split

| Process | Entry | Runs |
|---|---|---|
| Main | `electron/main.ts` | Node.js — file system, terminals, BrowserView, IPC |
| Preload | `electron/preload.ts` | Bridge — exposes `window.electron` API to renderer |
| Renderer | `src/main.tsx` | React — all UI |

**IPC rule**: renderer never touches Node APIs directly. All system ops go through `window.electron.*` → IPC → main process.

### Key source files

| File | Purpose |
|---|---|
| `src/App.tsx` | Root: routes between StartScreen and 3-panel layout |
| `src/stores/project-store.ts` | Zustand store — all project state |
| `src/components/sidebar/Sidebar.tsx` | Left panel: projects + files + ports |
| `src/components/start/StartScreen.tsx` | Welcome screen when no projects |
| `electron/main.ts` | Window creation, BrowserView management |
| `electron/preload.ts` | `window.electron` IPC surface |
| `electron/ipc/handlers.ts` | IPC handler registration |
| `electron/services/pty-manager.ts` | node-pty terminal spawning |
| `electron/services/port-manager.ts` | Port assignment + probing |
| `electron/services/dev-server.ts` | Framework detection + dev server spawning |

### State management

Zustand stores in `src/stores/`. No Redux, no Context for app state.

- `project-store.ts` — project list, active project, per-project open files + terminals
- `editor-store.ts` — open tabs, scroll positions (keyed by project ID)
- `terminal-store.ts` — terminal instances (keyed by project ID)

### BrowserView

One `BrowserView` per project, created lazily. Attached/detached on project switch (never destroyed). Bounds recalculated on window resize and panel drag. Managed in `electron/main.ts`.

### Config storage (`~/.glyph/`)

- `projects.json` — project list + settings
- `state.json` — window size, panel widths, active project
- `settings.json` — global preferences

## Design system

### Colors — Tailwind Zinc
Dark mode only. `zinc-950` app background, `zinc-900` panels, `zinc-800` cards/hover. All in `tailwind.config.ts`.

### Project accent colors
8 curated HSL values in `src/lib/colors.ts`. Auto-assigned on project add. Used for: active tab underline, terminal cursor, sidebar selection dot, focus rings.

### Typography
- UI: **Open Runde** (bundled in `src/assets/fonts/`, 4 weights)
- Code/terminal: **JetBrains Mono** (bundled)

### Icons
`@phosphor-icons/react` — `regular` weight for UI chrome, `light` at 32px for empty states, `fill` for active states.
