import { WebContentsView, BrowserWindow } from 'electron'

interface BrowserInstance {
  view: WebContentsView
  listenersSet: boolean
}

const instances = new Map<string, BrowserInstance>()

function getOrCreate(projectId: string): BrowserInstance {
  if (!instances.has(projectId)) {
    const view = new WebContentsView({
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

// Retry timers per projectId — cleared when navigation succeeds or project is hidden
const retryTimers = new Map<string, ReturnType<typeof setTimeout>>()

function clearRetry(projectId: string) {
  const t = retryTimers.get(projectId)
  if (t) { clearTimeout(t); retryTimers.delete(projectId) }
}

function scheduleRetry(projectId: string, url: string, win: BrowserWindow, delayMs = 2000) {
  clearRetry(projectId)
  retryTimers.set(projectId, setTimeout(() => {
    retryTimers.delete(projectId)
    const inst = instances.get(projectId)
    if (!inst || win.isDestroyed()) return
    inst.view.webContents.loadURL(url).catch(() => {})
  }, delayMs))
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

  // Retry on connection refused (dev server not up yet)
  wc.on('did-fail-load', (_e, errorCode, _desc, validatedURL) => {
    if (errorCode === -102 && validatedURL && !win.isDestroyed()) {
      scheduleRetry(projectId, validatedURL, win)
    }
  })

  // Clear retry once a page successfully loads
  wc.on('did-finish-load', () => clearRetry(projectId))
}

function removeFromWindow(view: WebContentsView, win: BrowserWindow): void {
  try {
    win.contentView.removeChildView(view)
  } catch { /* already detached — safe to ignore */ }
}

export function showBrowser(
  projectId: string,
  win: BrowserWindow,
  url: string,
  bounds: { x: number; y: number; width: number; height: number }
): void {
  // Remove all other browser instances from this window
  for (const [pid, inst] of instances) {
    if (pid !== projectId) removeFromWindow(inst.view, win)
  }

  ensureListeners(projectId, win)
  const inst = getOrCreate(projectId)

  // Add to window first, then set bounds (order matters for correct positioning)
  if (!win.contentView.children.includes(inst.view)) {
    win.contentView.addChildView(inst.view)
  }
  inst.view.setBounds(bounds)

  if (url && url !== 'about:blank') {
    const current = inst.view.webContents.getURL()
    if (current !== url) inst.view.webContents.loadURL(url)
  }
}

export function hideBrowser(projectId: string, win: BrowserWindow): void {
  clearRetry(projectId)
  const inst = instances.get(projectId)
  if (inst) removeFromWindow(inst.view, win)
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

export function clearAllBrowserViews(win: BrowserWindow): void {
  for (const [, inst] of instances) {
    removeFromWindow(inst.view, win)
  }
}
