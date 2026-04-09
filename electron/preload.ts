import { contextBridge, ipcRenderer, shell } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  // Projects
  addProject: (path: string) => ipcRenderer.invoke('project:add', { path }),
  removeProject: (id: string) => ipcRenderer.invoke('project:remove', { id }),
  openFolderDialog: () => ipcRenderer.invoke('dialog:openFolder'),

  // Terminals
  createTerminal: (projectId: string, projectPath: string, type: 'shell' | 'claude' | 'codex') =>
    ipcRenderer.invoke('terminal:create', { projectId, projectPath, type }),
  writeTerminal: (terminalId: string, data: string) =>
    ipcRenderer.invoke('terminal:write', { terminalId, data }),
  resizeTerminal: (terminalId: string, cols: number, rows: number) =>
    ipcRenderer.invoke('terminal:resize', { terminalId, cols, rows }),
  killTerminal: (terminalId: string) =>
    ipcRenderer.invoke('terminal:kill', { terminalId }),
  onTerminalData: (callback: (terminalId: string, data: string) => void) => {
    const handler = (_: unknown, terminalId: string, data: string) => callback(terminalId, data)
    ipcRenderer.on('terminal:data', handler)
    return () => ipcRenderer.off('terminal:data', handler)
  },
  onTerminalExit: (callback: (terminalId: string) => void) => {
    const handler = (_: unknown, terminalId: string) => callback(terminalId)
    ipcRenderer.on('terminal:exit', handler)
    return () => ipcRenderer.off('terminal:exit', handler)
  },

  // Files
  readFile: (path: string) => ipcRenderer.invoke('file:read', { path }),
  writeFile: (path: string, content: string) => ipcRenderer.invoke('file:write', { path, content }),
  readDir: (path: string) => ipcRenderer.invoke('file:readDir', { path }),
  onFileChanged: (callback: (path: string) => void) => {
    const handler = (_: unknown, path: string) => callback(path)
    ipcRenderer.on('file:changed', handler)
    return () => ipcRenderer.off('file:changed', handler)
  },

  // Favicon
  findFavicon: (projectPath: string) => ipcRenderer.invoke('project:findFavicon', { projectPath }),

  // Dev server
  startDevServer: (projectId: string) => ipcRenderer.invoke('devserver:start', { projectId }),
  stopDevServer: (projectId: string) => ipcRenderer.invoke('devserver:stop', { projectId }),
  onDevServerStatus: (callback: (projectId: string, status: string) => void) => {
    const handler = (_: unknown, projectId: string, status: string) => callback(projectId, status)
    ipcRenderer.on('devserver:status', handler)
    return () => ipcRenderer.off('devserver:status', handler)
  },

  // Git
  gitStatus: (projectPath: string) => ipcRenderer.invoke('git:status', { projectPath }),
  gitIgnored: (projectPath: string) => ipcRenderer.invoke('git:ignored', { projectPath }),
  gitClone: (url: string, dest: string) => ipcRenderer.invoke('git:clone', { url, dest }),

  // Browser
  showBrowser: (projectId: string, url: string, bounds: { x: number; y: number; width: number; height: number }) =>
    ipcRenderer.invoke('browser:show', { projectId, url, bounds }),
  hideBrowser: (projectId: string) => ipcRenderer.invoke('browser:hide', { projectId }),
  setBrowserBounds: (projectId: string, bounds: { x: number; y: number; width: number; height: number }) =>
    ipcRenderer.invoke('browser:setBounds', { projectId, bounds }),
  navigateBrowser: (projectId: string, url: string) => ipcRenderer.invoke('browser:navigate', { projectId, url }),
  browserBack: (projectId: string) => ipcRenderer.invoke('browser:back', { projectId }),
  browserForward: (projectId: string) => ipcRenderer.invoke('browser:forward', { projectId }),
  browserReload: (projectId: string) => ipcRenderer.invoke('browser:reload', { projectId }),
  onBrowserNavUpdate: (callback: (projectId: string, nav: { url: string; title: string; canGoBack: boolean; canGoForward: boolean; isLoading: boolean }) => void) => {
    const handler = (_: unknown, projectId: string, nav: { url: string; title: string; canGoBack: boolean; canGoForward: boolean; isLoading: boolean }) =>
      callback(projectId, nav)
    ipcRenderer.on('browser:nav-update', handler)
    return () => ipcRenderer.off('browser:nav-update', handler)
  },

  // Window
  setWindowTheme: (source: 'light' | 'dark' | 'system', bgColor: string) =>
    ipcRenderer.invoke('window:setTheme', { source, bgColor }),
  getHomePath: () => ipcRenderer.invoke('app:getHomePath'),
  mkdir: (path: string) => ipcRenderer.invoke('fs:mkdir', { path }),

  // Canvas persistence
  saveCanvasState: (projectId: string, data: string) =>
    ipcRenderer.invoke('canvas:save', { projectId, data }),
  loadCanvasState: (projectId: string) =>
    ipcRenderer.invoke('canvas:load', { projectId }),

  // Browser console messages
  onBrowserConsoleMessage: (callback: (projectId: string, msg: { level: number; message: string; source: string; line: number }) => void) => {
    const handler = (_: unknown, projectId: string, msg: { level: number; message: string; source: string; line: number }) =>
      callback(projectId, msg)
    ipcRenderer.on('browser:console-message', handler)
    return () => ipcRenderer.off('browser:console-message', handler)
  },

  // Port detection
  onPortDetected: (callback: (projectId: string, port: number) => void) => {
    const handler = (_: unknown, projectId: string, port: number) => callback(projectId, port)
    ipcRenderer.on('port:detected', handler)
    return () => ipcRenderer.off('port:detected', handler)
  },
  onPortCleared: (callback: (projectId: string) => void) => {
    const handler = (_: unknown, projectId: string) => callback(projectId)
    ipcRenderer.on('port:cleared', handler)
    return () => ipcRenderer.off('port:cleared', handler)
  },

  // Shell / file ops
  revealInFinder: (path: string) => shell.showItemInFolder(path),
  renameFile: (oldPath: string, newPath: string) => ipcRenderer.invoke('file:rename', { oldPath, newPath }),
  deleteFile: (path: string) => ipcRenderer.invoke('file:delete', { path }),
})
