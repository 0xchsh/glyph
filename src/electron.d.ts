export {}

declare global {
  interface Window {
    electron: {
      openFolderDialog: () => Promise<string | null>
      addProject: (path: string) => Promise<void>
      removeProject: (id: string) => Promise<void>
      readFile: (path: string) => Promise<string>
      writeFile: (path: string, content: string) => Promise<void>
      readDir: (path: string) => Promise<{ name: string; path: string; isDirectory: boolean }[]>
      createTerminal: (projectId: string, projectPath: string, type: 'shell' | 'claude' | 'codex') => Promise<string>
      writeTerminal: (terminalId: string, data: string) => Promise<void>
      resizeTerminal: (terminalId: string, cols: number, rows: number) => Promise<void>
      killTerminal: (terminalId: string) => Promise<void>
      onTerminalData: (callback: (terminalId: string, data: string) => void) => () => void
      onTerminalExit: (callback: (terminalId: string) => void) => () => void
      onFileChanged: (callback: (path: string) => void) => () => void
      gitStatus: (projectPath: string) => Promise<Record<string, string>>
      gitIgnored: (projectPath: string) => Promise<string[]>
      startDevServer: (projectId: string) => Promise<void>
      stopDevServer: (projectId: string) => Promise<void>
      onDevServerStatus: (callback: (projectId: string, status: string) => void) => () => void
      revealInFinder: (path: string) => void
      renameFile: (oldPath: string, newPath: string) => Promise<void>
      deleteFile: (path: string) => Promise<void>
      showBrowser: (projectId: string, url: string, bounds: { x: number; y: number; width: number; height: number }) => Promise<void>
      hideBrowser: (projectId: string) => Promise<void>
      setBrowserBounds: (projectId: string, bounds: { x: number; y: number; width: number; height: number }) => Promise<void>
      navigateBrowser: (projectId: string, url: string) => Promise<void>
      browserBack: (projectId: string) => Promise<void>
      browserForward: (projectId: string) => Promise<void>
      browserReload: (projectId: string) => Promise<void>
      onBrowserNavUpdate: (callback: (projectId: string, nav: { url: string; title: string; canGoBack: boolean; canGoForward: boolean; isLoading: boolean }) => void) => () => void
      setWindowTheme: (source: 'light' | 'dark' | 'system', bgColor: string) => Promise<void>
      getHomePath: () => Promise<string>
      mkdir: (path: string) => Promise<void>
    }
  }
}
