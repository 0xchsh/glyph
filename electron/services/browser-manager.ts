import { BrowserView, BrowserWindow } from 'electron'

interface BrowserInstance {
  view: BrowserView
  listenersSet: boolean
}

const instances = new Map<string, BrowserInstance>()

function getOrCreate(projectId: string): BrowserInstance {
  if (!instances.has(projectId)) {
    const view = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    })
    instances.set(projectId, { view, listenersSet: false })
  }
  return instances.get(projectId)!
}

function ensureListeners(projectId: string, win: BrowserWindow): void {
  const inst = getOrCreate(projectId)
  if (inst.listenersSet) return
  inst.listenersSet = true

  const wc = inst.view.webContents
  const send = () => {
    if (win.isDestroyed()) return
    win.webContents.send('browser:nav-update', projectId, {
      url: wc.getURL(),
      title: wc.getTitle(),
      canGoBack: wc.navigationHistory.canGoBack(),
      canGoForward: wc.navigationHistory.canGoForward(),
      isLoading: wc.isLoading(),
    })
  }

  wc.on('did-navigate', send)
  wc.on('did-navigate-in-page', send)
  wc.on('did-start-loading', send)
  wc.on('did-stop-loading', send)
  wc.on('page-title-updated', send)
}

export function showBrowser(
  projectId: string,
  win: BrowserWindow,
  url: string,
  bounds: { x: number; y: number; width: number; height: number }
): void {
  // Remove any currently visible browser views first
  win.getBrowserViews().forEach((v) => win.removeBrowserView(v))

  ensureListeners(projectId, win)
  const inst = getOrCreate(projectId)

  inst.view.setBounds(bounds)
  win.addBrowserView(inst.view)

  if (url && url !== 'about:blank') {
    const current = inst.view.webContents.getURL()
    if (current !== url) inst.view.webContents.loadURL(url)
  }
}

export function hideBrowser(projectId: string, win: BrowserWindow): void {
  const inst = instances.get(projectId)
  if (inst) win.removeBrowserView(inst.view)
}

export function setBrowserBounds(
  projectId: string,
  bounds: { x: number; y: number; width: number; height: number }
): void {
  instances.get(projectId)?.view.setBounds(bounds)
}

export function navigateBrowser(projectId: string, url: string): void {
  instances.get(projectId)?.view.webContents.loadURL(url)
}

export function browserBack(projectId: string): void {
  instances.get(projectId)?.view.webContents.goBack()
}

export function browserForward(projectId: string): void {
  instances.get(projectId)?.view.webContents.goForward()
}

export function browserReload(projectId: string): void {
  instances.get(projectId)?.view.webContents.reload()
}
