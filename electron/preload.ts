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

  // Dev server
  startDevServer: (projectId: string) => ipcRenderer.invoke('devserver:start', { projectId }),
  stopDevServer: (projectId: string) => ipcRenderer.invoke('devserver:stop', { projectId }),
  onDevServerStatus: (callback: (projectId: string, status: string) => void) => {
    const handler = (_: unknown, projectId: string, status: string) => callback(projectId, status)
    ipcRenderer.on('devserver:status', handler)
    return () => ipcRenderer.off('devserver:status', handler)
  },

  // Shell
  revealInFinder: (path: string) => shell.showItemInFolder(path),
})
