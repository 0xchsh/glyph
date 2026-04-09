import { useEffect, useRef } from 'react'
import { Terminal, ITheme } from 'xterm'
import { FitAddon } from '@xterm/addon-fit'
import { useTerminalStore } from '../../stores/terminal-store'
import 'xterm/css/xterm.css'

interface Props {
  terminalId: string
  accentColor: string
  active: boolean
  isDark: boolean
}

const DARK_THEME: ITheme = {
  background: '#09090b',   // zinc-950
  foreground: '#d4d4d8',   // zinc-300
  cursor: '#a1a1aa',       // zinc-400
  cursorAccent: '#09090b',
  black: '#27272a',        // zinc-800
  red: '#f87171',          // red-400
  green: '#6ee7b7',        // emerald-300 — softer than pure green
  yellow: '#fcd34d',       // amber-300
  blue: '#7dd3fc',         // sky-300
  magenta: '#c4b5fd',      // violet-300
  cyan: '#67e8f9',         // cyan-300
  white: '#d4d4d8',        // zinc-300
  brightBlack: '#52525b',  // zinc-600
  brightRed: '#fca5a5',    // red-300
  brightGreen: '#a7f3d0',  // emerald-200
  brightYellow: '#fde68a', // amber-200
  brightBlue: '#bae6fd',   // sky-200
  brightMagenta: '#ddd6fe',// violet-200
  brightCyan: '#a5f3fc',   // cyan-200
  brightWhite: '#f4f4f5',  // zinc-100
}

const LIGHT_THEME: ITheme = {
  background: '#fafafa',   // zinc-50
  foreground: '#18181b',   // zinc-900
  cursor: '#52525b',       // zinc-600
  cursorAccent: '#fafafa',
  black: '#18181b',        // zinc-900
  red: '#dc2626',          // red-600
  green: '#059669',        // emerald-600
  yellow: '#b45309',       // amber-700 — readable on light
  blue: '#2563eb',         // blue-600
  magenta: '#7c3aed',      // violet-600
  cyan: '#0891b2',         // cyan-600
  white: '#52525b',        // zinc-600
  brightBlack: '#71717a',  // zinc-500
  brightRed: '#ef4444',    // red-500
  brightGreen: '#10b981',  // emerald-500
  brightYellow: '#d97706', // amber-600
  brightBlue: '#3b82f6',   // blue-500
  brightMagenta: '#8b5cf6',// violet-500
  brightCyan: '#06b6d4',   // cyan-500
  brightWhite: '#18181b',  // zinc-900
}

const openTerminals = new Map<string, { term: Terminal; fit: FitAddon }>()

export function destroyTerminalInstance(terminalId: string): void {
  const inst = openTerminals.get(terminalId)
  if (inst) {
    if (inst.term.element?.parentElement) {
      inst.term.element.parentElement.removeChild(inst.term.element)
    }
    inst.term.dispose()
    openTerminals.delete(terminalId)
  }
}

function buildTheme(base: ITheme, accentHex: string): ITheme {
  // Keep terminal background flat (no accent tint) — only the cursor gets accent color
  return { ...base, cursor: accentHex, cursorAccent: base.background }
}

export function TerminalInstance({ terminalId, accentColor, active, isDark }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Update theme when dark/light mode or accent color changes
  useEffect(() => {
    const inst = openTerminals.get(terminalId)
    if (inst) inst.term.options.theme = buildTheme(isDark ? DARK_THEME : LIGHT_THEME, accentColor)
  }, [isDark, accentColor, terminalId])

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    let cancelled = false
    let disposeInput: ReturnType<Terminal['onData']> | undefined
    let unsubscribe: (() => void) | undefined
    let resizeObserver: ResizeObserver | undefined
    let term: Terminal | undefined
    let fit: FitAddon | undefined

    async function setup() {
      if (openTerminals.has(terminalId)) {
        // Reuse existing xterm instance — re-attach to DOM
        const inst = openTerminals.get(terminalId)!
        term = inst.term
        fit = inst.fit
        if (!cancelled) container.appendChild(term.element!)
      } else {
        // Wait for JetBrains Mono to be measured by the browser before creating
        // the terminal — xterm.js measures cell width at creation time, so if the
        // font isn't ready yet it falls back to the generic monospace metrics and
        // renders characters with gaps once the real font kicks in.
        try { await document.fonts.load('12px "JetBrains Mono"') } catch { /* fallback ok */ }
        if (cancelled) return

        term = new Terminal({
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 12,
          lineHeight: 1.0,
          letterSpacing: 0,
          theme: buildTheme(isDark ? DARK_THEME : LIGHT_THEME, accentColor),
          cursorStyle: 'block',
          cursorBlink: true,
          allowTransparency: true,
          scrollback: 5000,
        })

        fit = new FitAddon()
        term.loadAddon(fit)
        term.open(container)
        openTerminals.set(terminalId, { term, fit })
      }

      if (cancelled || !term || !fit) return

      // Always (re-)register listeners — strict mode unmount/remount disposes them,
      // so we must re-add them even when reusing an existing xterm instance.
      fit.fit()
      if (active) term.focus()

      disposeInput = term.onData((data) => {
        window.electron.writeTerminal(terminalId, data)
      })

      let idleTimer: ReturnType<typeof setTimeout> | null = null
      unsubscribe = window.electron.onTerminalData((id, data) => {
        if (id !== terminalId) return
        term!.write(data)
        useTerminalStore.getState().setTerminalBusy(terminalId, true)
        if (idleTimer) clearTimeout(idleTimer)
        idleTimer = setTimeout(() => {
          useTerminalStore.getState().setTerminalBusy(terminalId, false)
        }, 800)
      })

      resizeObserver = new ResizeObserver(() => {
        // Skip when hidden — container reports 0×0 and fit() would wipe the buffer
        if (container.offsetWidth === 0 || container.offsetHeight === 0) return
        fit!.fit()
        window.electron.resizeTerminal(terminalId, term!.cols, term!.rows)
      })
      resizeObserver.observe(container)
    }

    setup()

    return () => {
      cancelled = true
      disposeInput?.dispose()
      unsubscribe?.()
      resizeObserver?.disconnect()
      useTerminalStore.getState().setTerminalBusy(terminalId, false)
      // Detach from DOM but keep the instance alive for tab switching
      if (term?.element?.parentElement) {
        term.element.parentElement.removeChild(term.element)
      }
    }
  }, [terminalId, accentColor])

  // Focus when tab becomes active
  useEffect(() => {
    if (active) {
      const inst = openTerminals.get(terminalId)
      if (inst) {
        inst.fit.fit()
        inst.term.focus()
      }
    }
  }, [active, terminalId])

  return (
    <div
      ref={containerRef}
      className="h-full w-full terminal-padded"
    />
  )
}
