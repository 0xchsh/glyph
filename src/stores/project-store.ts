import { create } from 'zustand'
import { PaletteKey, PALETTE_KEYS } from '../lib/palettes'

export interface GlyphProject {
  id: string
  name: string
  path: string
  port: number
  palette: PaletteKey
  icon: 'auto' | string
  devCommand: string | null
  openFiles: string[]
  activeFile: string | null
}

interface ProjectStore {
  projects: GlyphProject[]
  activeProjectId: string | null
  setActiveProject: (id: string) => void
  addProject: (path: string) => GlyphProject
  removeProject: (id: string) => void
}

let nextPort = 3000

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  activeProjectId: null,

  setActiveProject: (id) => set({ activeProjectId: id }),

  addProject: (path) => {
    const name = path.split('/').pop() ?? path
    const { projects } = get()
    const project: GlyphProject = {
      id: crypto.randomUUID(),
      name,
      path,
      port: nextPort++,
      palette: 'zinc',
      icon: 'auto',
      devCommand: null,
      openFiles: [],
      activeFile: null,
    }
    set((state) => ({
      projects: [...state.projects, project],
      activeProjectId: state.activeProjectId ?? project.id,
    }))
    return project
  },

  removeProject: (id) =>
    set((state) => {
      const remaining = state.projects.filter((p) => p.id !== id)
      return {
        projects: remaining,
        activeProjectId:
          state.activeProjectId === id ? (remaining[0]?.id ?? null) : state.activeProjectId,
      }
    }),
}))

export const useActiveProject = () => {
  const { projects, activeProjectId } = useProjectStore()
  return projects.find((p) => p.id === activeProjectId) ?? null
}
