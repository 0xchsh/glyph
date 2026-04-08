import { create } from 'zustand'
import { PaletteKey, PALETTE_KEYS } from '../lib/palettes'

export type ProjectLayout = 'vertical' | 'horizontal'

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
  layout: ProjectLayout
}

interface ProjectStore {
  projects: GlyphProject[]
  activeProjectId: string | null
  setActiveProject: (id: string) => void
  addProject: (path: string) => GlyphProject
  removeProject: (id: string) => void
  setProjectLayout: (id: string, layout: ProjectLayout) => void
  setProjectIcon: (id: string, icon: string) => void
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
      layout: 'vertical',
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

  setProjectLayout: (id, layout) =>
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? { ...p, layout } : p)),
    })),

  setProjectIcon: (id, icon) =>
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? { ...p, icon } : p)),
    })),
}))

export const useActiveProject = () => {
  const { projects, activeProjectId } = useProjectStore()
  return projects.find((p) => p.id === activeProjectId) ?? null
}
