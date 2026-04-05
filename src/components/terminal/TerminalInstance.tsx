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

export function TerminalInstance({ terminalId, accentColor, active }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    let term: Terminal
    let fit: FitAddon

    if (openTerminals.has(terminalId)) {
      // Reuse existing xterm instance — re-attach to DOM
      const inst = openTerminals.get(terminalId)!
      term = inst.term
      fit = inst.fit
      containerRef.current.appendChild(term.element!)
    } else {
      // Create new xterm instance
      term = new Terminal({
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 12,
        lineHeight: 1.0,
        theme: {
          background: '#09090b',
          foreground: '#e4e4e7',
          cursor: '#ffffff',
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
        cursorStyle: 'block',
        cursorBlink: true,
        allowTransparency: true,
        scrollback: 5000,
      })

      fit = new FitAddon()
      term.loadAddon(fit)
      term.open(containerRef.current)
      openTerminals.set(terminalId, { term, fit })
    }

    // Always (re-)register listeners — strict mode unmount/remount disposes them,
    // so we must re-add them even when reusing an existing xterm instance.
    fit.fit()
    if (active) term.focus()

    const disposeInput = term.onData((data) => {
      window.electron.writeTerminal(terminalId, data)
    })

    const unsubscribe = window.electron.onTerminalData((id, data) => {
      if (id === terminalId) term.write(data)
    })

    const resizeObserver = new ResizeObserver(() => {
      fit.fit()
      window.electron.resizeTerminal(terminalId, term.cols, term.rows)
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      disposeInput.dispose()
      unsubscribe()
      resizeObserver.disconnect()
      // Detach from DOM but keep the instance alive for tab switching
      if (term.element?.parentElement) {
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
      className="h-full w-full"
      style={{ padding: '8px 4px' }}
    />
  )
}
