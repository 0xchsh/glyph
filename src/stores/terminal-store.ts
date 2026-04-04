import { create } from 'zustand'

export type TerminalType = 'shell' | 'claude' | 'codex'

export interface TerminalTab {
  id: string          // terminalId from main process
  type: TerminalType
  projectId: string
  title: string
}

interface TerminalStore {
  // Per-project terminal tabs: projectId → tabs
  tabs: Record<string, TerminalTab[]>
  // Active tab per project
  activeTabId: Record<string, string | null>

  addTab: (projectId: string, tab: TerminalTab) => void
  removeTab: (projectId: string, tabId: string) => void
  setActiveTab: (projectId: string, tabId: string) => void
  getProjectTabs: (projectId: string) => TerminalTab[]
  getActiveTabId: (projectId: string) => string | null
}

export const useTerminalStore = create<TerminalStore>((set, get) => ({
  tabs: {},
  activeTabId: {},

  addTab: (projectId, tab) =>
    set((state) => {
      const existing = state.tabs[projectId] ?? []
      return {
        tabs: { ...state.tabs, [projectId]: [...existing, tab] },
        activeTabId: { ...state.activeTabId, [projectId]: tab.id },
      }
    }),

  removeTab: (projectId, tabId) =>
    set((state) => {
      const existing = state.tabs[projectId] ?? []
      const updated = existing.filter((t) => t.id !== tabId)
      const currentActive = state.activeTabId[projectId]
      const newActive =
        currentActive === tabId ? (updated[updated.length - 1]?.id ?? null) : currentActive
      return {
        tabs: { ...state.tabs, [projectId]: updated },
        activeTabId: { ...state.activeTabId, [projectId]: newActive },
      }
    }),

  setActiveTab: (projectId, tabId) =>
    set((state) => ({
      activeTabId: { ...state.activeTabId, [projectId]: tabId },
    })),

  getProjectTabs: (projectId) => get().tabs[projectId] ?? [],
  getActiveTabId: (projectId) => get().activeTabId[projectId] ?? null,
}))
