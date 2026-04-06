import { app, BrowserWindow, BrowserView, ipcMain, dialog, shell } from 'electron'
import { join } from 'path'
import { registerIpcHandlers } from './ipc/handlers'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#09090b', // zinc-950
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  // Handle zoom manually to suppress the native Chromium dimensions overlay
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (!input.meta || input.type !== 'keyDown') return
    const key = input.key
    if (key === '=' || key === '+') {
      event.preventDefault()
      const z = mainWindow!.webContents.getZoomFactor()
      mainWindow!.webContents.setZoomFactor(Math.min(3, z + 0.1))
    } else if (key === '-') {
      event.preventDefault()
      const z = mainWindow!.webContents.getZoomFactor()
      mainWindow!.webContents.setZoomFactor(Math.max(0.3, z - 0.1))
    } else if (key === '0') {
      event.preventDefault()
      mainWindow!.webContents.setZoomFactor(1.0)
    }
  })

  // Clear any stale BrowserViews when the renderer (re)loads — prevents
  // old overlays from persisting across HMR reloads or dev-server restarts.
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.getBrowserViews().forEach((v) => mainWindow?.removeBrowserView(v))
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    const rendererUrl = process.env['ELECTRON_RENDERER_URL']
    // Retry loading in case Electron races ahead of the Vite dev server
    mainWindow.webContents.on('did-fail-load', (_e, code) => {
      // ERR_CONNECTION_REFUSED (-102) means Vite isn't ready yet
      if (code === -102 && !mainWindow?.isDestroyed()) {
        setTimeout(() => mainWindow?.loadURL(rendererUrl), 500)
      }
    })
    mainWindow.loadURL(rendererUrl)
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  registerIpcHandlers(mainWindow)
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
