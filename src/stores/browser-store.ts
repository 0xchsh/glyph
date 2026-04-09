import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface NavInfo {
  url: string
  title: string
  canGoBack: boolean
  canGoForward: boolean
  isLoading: boolean
}

interface BrowserStore {
  // Which projects have the browser panel open
  visible: Record<string, boolean>
  // Saved URL per project (persisted so it survives restarts)
  savedUrls: Record<string, string>
  // Live nav state per project (not persisted)
  navState: Record<string, NavInfo>
  // Canvas mode per project — true = TLDraw canvas, false = browser (persisted)
  canvasMode: Record<string, boolean>
  // Console panel visibility per project (transient)
  consoleOpen: Record<string, boolean>
  // Browser fullscreen per project (transient)
  fullscreen: Record<string, boolean>

  openBrowser: (projectId: string) => void
  closeBrowser: (projectId: string) => void
  updateNav: (projectId: string, nav: NavInfo) => void
  setSavedUrl: (projectId: string, url: string) => void
  setCanvasMode: (projectId: string, enabled: boolean) => void
  toggleConsole: (projectId: string) => void
  toggleFullscreen: (projectId: string) => void
}

export const useBrowserStore = create<BrowserStore>()(
  persist(
    (set) => ({
      visible: {},
      savedUrls: {},
      navState: {},
      canvasMode: {},
      consoleOpen: {},
      fullscreen: {},

      openBrowser: (projectId) =>
        set((s) => ({ visible: { ...s.visible, [projectId]: true } })),

      closeBrowser: (projectId) =>
        set((s) => ({ visible: { ...s.visible, [projectId]: false } })),

      updateNav: (projectId, nav) =>
        set((s) => ({
          navState: { ...s.navState, [projectId]: nav },
          savedUrls: nav.url
            ? { ...s.savedUrls, [projectId]: nav.url }
            : s.savedUrls,
        })),

      setSavedUrl: (projectId, url) =>
        set((s) => ({ savedUrls: { ...s.savedUrls, [projectId]: url } })),

      setCanvasMode: (projectId, enabled) =>
        set((s) => ({ canvasMode: { ...s.canvasMode, [projectId]: enabled } })),

      toggleConsole: (projectId) =>
        set((s) => ({ consoleOpen: { ...s.consoleOpen, [projectId]: !s.consoleOpen[projectId] } })),

      toggleFullscreen: (projectId) =>
        set((s) => ({ fullscreen: { ...s.fullscreen, [projectId]: !s.fullscreen[projectId] } })),
    }),
    {
      name: 'glyph-browser',
      partialize: (s) => ({ savedUrls: s.savedUrls, canvasMode: s.canvasMode }),
    }
  )
)
