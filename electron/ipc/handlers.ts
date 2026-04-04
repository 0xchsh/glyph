import { ipcMain, dialog, BrowserWindow } from 'electron'
import { readFile, writeFile, readdir } from 'fs/promises'
import { join } from 'path'
import { createPty, writePty, resizePty } from '../services/pty-manager'

export function registerIpcHandlers(win: BrowserWindow): void {
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
      const terminalId = crypto.randomUUID()
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
}
