import * as pty from 'node-pty'
import { BrowserWindow } from 'electron'

interface PtyInstance {
  pty: pty.IPty
  projectId: string
  type: 'shell' | 'claude' | 'codex'
}

const instances = new Map<string, PtyInstance>()

function getShell(): string {
  return process.env['SHELL'] ?? (process.platform === 'win32' ? 'cmd.exe' : '/bin/zsh')
}

function getArgs(type: 'shell' | 'claude' | 'codex'): string[] {
  if (type === 'claude') return ['-i', '-l', '-c', 'claude']
  if (type === 'codex') return ['-i', '-l', '-c', 'codex']
  return ['-i', '-l']
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
    env: { ...process.env, TERM: 'xterm-256color' } as Record<string, string>,
  })

  instance.onData((data) => {
    if (!win.isDestroyed()) {
      win.webContents.send('terminal:data', terminalId, data)
    }
  })

  instance.onExit(() => {
    instances.delete(terminalId)
    if (!win.isDestroyed()) {
      win.webContents.send('terminal:exit', terminalId)
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

export function destroyProjectPtys(projectId: string): void {
  for (const [id, inst] of instances) {
    if (inst.projectId === projectId) {
      inst.pty.kill()
      instances.delete(id)
    }
  }
}
