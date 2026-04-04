import { useEffect, useRef } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from '@xterm/addon-fit'
import 'xterm/css/xterm.css'

interface Props {
  terminalId: string
  accentColor: string
  active: boolean
}

const openTerminals = new Map<string, { term: Terminal; fit: FitAddon }>()

export function TerminalInstance({ terminalId, accentColor, active }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Reuse existing xterm instance if already created
    if (openTerminals.has(terminalId)) {
      const { term, fit } = openTerminals.get(terminalId)!
      containerRef.current.appendChild(term.element!)
      if (active) {
        fit.fit()
        term.focus()
      }
      return () => {
        // Detach from DOM but keep alive
        if (term.element?.parentElement) {
          term.element.parentElement.removeChild(term.element)
        }
      }
    }

    const term = new Terminal({
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: 13,
      lineHeight: 1.5,
      theme: {
        background: '#09090b',       // zinc-950
        foreground: '#e4e4e7',       // zinc-200
        cursor: accentColor,
        cursorAccent: '#09090b',
        black: '#18181b',
        red: '#f87171',
        green: '#4ade80',
        yellow: '#fbbf24',
        blue: '#60a5fa',
        magenta: '#c084fc',
        cyan: '#22d3ee',
        white: '#e4e4e7',
        brightBlack: '#3f3f46',
        brightRed: '#fca5a5',
        brightGreen: '#86efac',
        brightYellow: '#fde68a',
        brightBlue: '#93c5fd',
        brightMagenta: '#d8b4fe',
        brightCyan: '#67e8f9',
        brightWhite: '#f4f4f5',
      },
      cursorBlink: true,
      allowTransparency: true,
      scrollback: 5000,
    })

    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(containerRef.current)
    fit.fit()
    term.focus()

    openTerminals.set(terminalId, { term, fit })

    // Send user input to main process
    const disposeInput = term.onData((data) => {
      window.electron.writeTerminal(terminalId, data)
    })

    // Receive output from main process
    const unsubscribe = window.electron.onTerminalData((id, data) => {
      if (id === terminalId) term.write(data)
    })

    // Resize on container size change
    const resizeObserver = new ResizeObserver(() => {
      fit.fit()
      window.electron.resizeTerminal(terminalId, term.cols, term.rows)
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      disposeInput.dispose()
      unsubscribe()
      resizeObserver.disconnect()
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
      className="h-full w-full"
      style={{ padding: '8px 4px' }}
    />
  )
}
