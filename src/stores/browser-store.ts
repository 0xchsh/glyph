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

  openBrowser: (projectId: string) => void
  closeBrowser: (projectId: string) => void
  updateNav: (projectId: string, nav: NavInfo) => void
  setSavedUrl: (projectId: string, url: string) => void
}

export const useBrowserStore = create<BrowserStore>()(
  persist(
    (set) => ({
      visible: {},
      savedUrls: {},
      navState: {},

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
    }),
    {
      name: 'glyph-browser',
      partialize: (s) => ({ savedUrls: s.savedUrls }),
    }
  )
)
