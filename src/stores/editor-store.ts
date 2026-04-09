import { create } from 'zustand'

interface EditorStore {
  fileContents: Record<string, string>       // path → content
  setFileContent: (path: string, content: string) => void
  loadFileContent: (path: string) => Promise<void>
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  fileContents: {},

  setFileContent: (path, content) =>
    set((s) => ({ fileContents: { ...s.fileContents, [path]: content } })),

  loadFileContent: async (path) => {
    if (path in get().fileContents) return
    try {
      const content = await window.electron.readFile(path)
      set((s) => ({ fileContents: { ...s.fileContents, [path]: content } }))
    } catch {
      set((s) => ({ fileContents: { ...s.fileContents, [path]: '' } }))
    }
  },
}))
