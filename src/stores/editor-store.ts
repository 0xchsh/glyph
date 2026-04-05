import { create } from 'zustand'

interface EditorStore {
  openFiles: Record<string, string[]>        // projectId → ordered file paths
  activeFile: Record<string, string | null>  // projectId → active path
  fileContents: Record<string, string>       // path → content

  openFile: (projectId: string, path: string) => Promise<void>
  closeFile: (projectId: string, path: string) => void
  setActiveFile: (projectId: string, path: string) => void
  setFileContent: (path: string, content: string) => void
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  openFiles: {},
  activeFile: {},
  fileContents: {},

  openFile: async (projectId, path) => {
    const state = get()
    const existing = state.openFiles[projectId] ?? []

    // Already open — just activate
    if (existing.includes(path)) {
      set((s) => ({ activeFile: { ...s.activeFile, [projectId]: path } }))
      return
    }

    // Load content if not cached
    if (!(path in state.fileContents)) {
      try {
        const content = await window.electron.readFile(path)
        set((s) => ({ fileContents: { ...s.fileContents, [path]: content } }))
      } catch {
        set((s) => ({ fileContents: { ...s.fileContents, [path]: '' } }))
      }
    }

    set((s) => ({
      openFiles: { ...s.openFiles, [projectId]: [...(s.openFiles[projectId] ?? []), path] },
      activeFile: { ...s.activeFile, [projectId]: path },
    }))
  },

  closeFile: (projectId, path) =>
    set((state) => {
      const files = state.openFiles[projectId] ?? []
      const updated = files.filter((f) => f !== path)
      const currentActive = state.activeFile[projectId]
      let newActive = currentActive
      if (currentActive === path) {
        const idx = files.indexOf(path)
        newActive = updated[idx] ?? updated[idx - 1] ?? null
      }
      return {
        openFiles: { ...state.openFiles, [projectId]: updated },
        activeFile: { ...state.activeFile, [projectId]: newActive },
      }
    }),

  setActiveFile: (projectId, path) =>
    set((s) => ({ activeFile: { ...s.activeFile, [projectId]: path } })),

  setFileContent: (path, content) =>
    set((s) => ({ fileContents: { ...s.fileContents, [path]: content } })),
}))
