import { ipcMain, dialog, BrowserWindow, nativeTheme, app, shell } from 'electron'
import { readFile, writeFile, readdir, mkdir, rename, rm } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { exec } from 'child_process'
import { promisify } from 'util'
import { createPty, writePty, resizePty, destroyPty, destroyProjectPtys } from '../services/pty-manager'
import {
  showBrowser, hideBrowser, setBrowserBounds,
  navigateBrowser, browserBack, browserForward, browserReload,
} from '../services/browser-manager'

const execAsync = promisify(exec)

const CHANNELS = [
  'dialog:openFolder', 'file:read', 'file:write', 'file:readDir',
  'file:rename', 'file:delete',
  'terminal:create', 'terminal:write', 'terminal:resize', 'terminal:kill',
  'project:remove', 'project:findFavicon', 'git:status', 'git:ignored', 'git:clone',
  'browser:show', 'browser:hide', 'browser:setBounds',
  'browser:navigate', 'browser:back', 'browser:forward', 'browser:reload',
  'window:setTheme', 'app:getHomePath', 'fs:mkdir',
  'canvas:save', 'canvas:load',
]

export function registerIpcHandlers(win: BrowserWindow): void {
  // Remove any existing handlers before re-registering (prevents crash on macOS activate)
  CHANNELS.forEach((ch) => ipcMain.removeHandler(ch))

  // File picker
  ipcMain.handle('dialog:openFolder', async () => {
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: 'Add project to Glyph',
    })
    return result.canceled ? null : result.filePaths[0]
  })

  // File ops
  ipcMain.handle('file:read', async (_, { path }: { path: string }) => {
    return readFile(path, 'utf8')
  })

  ipcMain.handle('file:write', async (_, { path, content }: { path: string; content: string }) => {
    await writeFile(path, content, 'utf8')
  })

  ipcMain.handle('file:rename', async (_, { oldPath, newPath }: { oldPath: string; newPath: string }) => {
    await rename(oldPath, newPath)
  })

  ipcMain.handle('file:delete', async (_, { path }: { path: string }) => {
    // trashItem moves to Trash rather than permanently deleting
    await shell.trashItem(path)
  })

  ipcMain.handle('file:readDir', async (_, { path }: { path: string }) => {
    const entries = await readdir(path, { withFileTypes: true })
    return Promise.all(
      entries.map(async (entry) => ({
        name: entry.name,
        path: join(path, entry.name),
        isDirectory: entry.isDirectory(),
      }))
    )
  })

  // Terminal
  ipcMain.handle(
    'terminal:create',
    (_, { projectId, projectPath, type }: { projectId: string; projectPath: string; type: 'shell' | 'claude' | 'codex' }) => {
      const terminalId = randomUUID()
      createPty(terminalId, projectId, projectPath, type, win)
      return terminalId
    }
  )

  ipcMain.handle('terminal:write', (_, { terminalId, data }: { terminalId: string; data: string }) => {
    writePty(terminalId, data)
  })

  ipcMain.handle(
    'terminal:resize',
    (_, { terminalId, cols, rows }: { terminalId: string; cols: number; rows: number }) => {
      resizePty(terminalId, cols, rows)
    }
  )

  ipcMain.handle('terminal:kill', (_, { terminalId }: { terminalId: string }) => {
    destroyPty(terminalId)
  })

  ipcMain.handle('project:remove', (_, { projectId }: { projectId: string }) => {
    destroyProjectPtys(projectId)
  })

  // Favicon detection — probe common paths in the project directory
  const FAVICON_CANDIDATES = [
    'public/favicon.ico', 'public/favicon.png', 'public/favicon.svg',
    'app/favicon.ico', 'app/favicon.png', 'src/favicon.ico', 'favicon.ico',
  ]
  const FAVICON_MIME: Record<string, string> = {
    ico: 'image/x-icon', png: 'image/png', svg: 'image/svg+xml',
    webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  }
  ipcMain.handle('project:findFavicon', async (_, { projectPath }: { projectPath: string }) => {
    for (const rel of FAVICON_CANDIDATES) {
      try {
        const buf = await readFile(join(projectPath, rel))
        const ext = rel.split('.').pop() ?? 'ico'
        const mime = FAVICON_MIME[ext] ?? 'image/x-icon'
        return `data:${mime};base64,${buf.toString('base64')}`
      } catch {
        continue
      }
    }
    return null
  })

  // Git
  ipcMain.handle('git:status', async (_, { projectPath }: { projectPath: string }) => {
    try {
      const { stdout } = await execAsync('git status --porcelain', { cwd: projectPath })
      const result: Record<string, string> = {}
      for (const line of stdout.split('\n')) {
        if (!line.trim()) continue
        const xy = line.slice(0, 2)
        const file = line.slice(3).trim()
        // Handle renamed files (old -> new)
        const actualFile = file.includes(' -> ') ? file.split(' -> ')[1] : file
        result[actualFile] = xy
      }
      return result
    } catch {
      return {}
    }
  })

  ipcMain.handle('git:ignored', async (_, { projectPath }: { projectPath: string }) => {
    try {
      const { stdout } = await execAsync(
        'git ls-files --others --ignored --exclude-standard',
        { cwd: projectPath }
      )
      return stdout.split('\n').filter(Boolean)
    } catch {
      return []
    }
  })

  // Git clone
  ipcMain.handle('git:clone', async (_, { url, dest }: { url: string; dest: string }) => {
    await execAsync(`git clone ${JSON.stringify(url)} ${JSON.stringify(dest)}`, { timeout: 120_000 })
    return dest
  })

  // Browser
  ipcMain.handle(
    'browser:show',
    (_, { projectId, url, bounds }: { projectId: string; url: string; bounds: { x: number; y: number; width: number; height: number } }) => {
      showBrowser(projectId, win, url, bounds)
    }
  )

  ipcMain.handle('browser:hide', (_, { projectId }: { projectId: string }) => {
    hideBrowser(projectId, win)
  })

  ipcMain.handle(
    'browser:setBounds',
    (_, { projectId, bounds }: { projectId: string; bounds: { x: number; y: number; width: number; height: number } }) => {
      setBrowserBounds(projectId, bounds)
    }
  )

  ipcMain.handle('browser:navigate', (_, { projectId, url }: { projectId: string; url: string }) => {
    navigateBrowser(projectId, url)
  })

  ipcMain.handle('browser:back', (_, { projectId }: { projectId: string }) => {
    browserBack(projectId)
  })

  ipcMain.handle('browser:forward', (_, { projectId }: { projectId: string }) => {
    browserForward(projectId)
  })

  ipcMain.handle('browser:reload', (_, { projectId }: { projectId: string }) => {
    browserReload(projectId)
  })

  ipcMain.handle('app:getHomePath', () => app.getPath('home'))

  // Canvas persistence
  const canvasDir = join(app.getPath('home'), '.glyph', 'canvas')
  ipcMain.handle('canvas:save', async (_, { projectId, data }: { projectId: string; data: string }) => {
    await mkdir(canvasDir, { recursive: true })
    await writeFile(join(canvasDir, `${projectId}.json`), data, 'utf8')
  })

  ipcMain.handle('canvas:load', async (_, { projectId }: { projectId: string }) => {
    try {
      return await readFile(join(canvasDir, `${projectId}.json`), 'utf8')
    } catch {
      return null
    }
  })

  ipcMain.handle('fs:mkdir', async (_, { path }: { path: string }) => {
    await mkdir(path, { recursive: true })
  })

  ipcMain.handle(
    'window:setTheme',
    (_, { source, bgColor }: { source: 'light' | 'dark' | 'system'; bgColor: string }) => {
      nativeTheme.themeSource = source
      win.setBackgroundColor(bgColor)
    }
  )
}
