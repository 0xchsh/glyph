import * as pty from 'node-pty'
import { BrowserWindow } from 'electron'

interface PtyInstance {
  pty: pty.IPty
  projectId: string
  type: 'shell' | 'claude' | 'codex'
}

const instances = new Map<string, PtyInstance>()
const detectedPorts = new Map<string, number>()

const ANSI_RE = /\x1b\[[0-9;]*[a-zA-Z]/g
const PORT_RE = /https?:\/\/(?:localhost|127\.0\.0\.1):(\d+)/

function getShell(): string {
  return process.env['SHELL'] ?? (process.platform === 'win32' ? 'cmd.exe' : '/bin/zsh')
}

function getArgs(type: 'shell' | 'claude' | 'codex'): string[] {
  if (type === 'claude') return ['-c', 'claude']
  if (type === 'codex') return ['-c', 'codex']
  return []
}

function buildEnv(): Record<string, string> {
  const PATH = [
    '/opt/homebrew/bin',
    '/opt/homebrew/sbin',
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
    '/usr/sbin',
    '/sbin',
    process.env['PATH'] ?? '',
  ].filter(Boolean).join(':')

  return {
    ...process.env as Record<string, string>,
    PATH,
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor',
    // Suppress zsh's end-of-line marker — it appears as a stray "%" at the top
    // of new terminals when the PTY starts at different dimensions than xterm.js.
    PROMPT_EOL_MARK: '',
  }
}

export function createPty(
  terminalId: string,
  projectId: string,
  projectPath: string,
  type: 'shell' | 'claude' | 'codex',
  win: BrowserWindow
): void {
  const shell = getShell()
  const args = getArgs(type)

  const instance = pty.spawn(shell, args, {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: projectPath,
    env: buildEnv(),
  })

  instance.onData((data) => {
    if (!win.isDestroyed()) {
      win.webContents.send('terminal:data', terminalId, data)

      // Detect port from dev server output (e.g. "http://localhost:3000")
      const clean = data.replace(ANSI_RE, '')
      const match = clean.match(PORT_RE)
      if (match) {
        const port = parseInt(match[1], 10)
        if (port !== detectedPorts.get(projectId)) {
          detectedPorts.set(projectId, port)
          win.webContents.send('port:detected', projectId, port)
        }
      }
    }
  })

  instance.onExit(() => {
    instances.delete(terminalId)
    if (!win.isDestroyed()) {
      win.webContents.send('terminal:exit', terminalId)

      // Clear detected port when no terminals remain for this project
      const hasRemaining = [...instances.values()].some(i => i.projectId === projectId)
      if (!hasRemaining) {
        detectedPorts.delete(projectId)
        win.webContents.send('port:cleared', projectId)
      }
    }
  })

  instances.set(terminalId, { pty: instance, projectId, type })
}

export function writePty(terminalId: string, data: string): void {
  instances.get(terminalId)?.pty.write(data)
}

export function resizePty(terminalId: string, cols: number, rows: number): void {
  instances.get(terminalId)?.pty.resize(cols, rows)
}

export function destroyPty(terminalId: string): void {
  const inst = instances.get(terminalId)
  if (inst) {
    inst.pty.kill()
    instances.delete(terminalId)
  }
}

export function destroyProjectPtys(projectId: string): void {
  for (const [id, inst] of instances) {
    if (inst.projectId === projectId) {
      inst.pty.kill()
      instances.delete(id)
    }
  }
}
