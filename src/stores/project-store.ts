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
  faviconUrl: string | null
  devCommand: string | null
  openFiles: string[]
  activeFile: string | null
  layout: ProjectLayout
}

interface ProjectStore {
  projects: GlyphProject[]
  activeProjectId: string | null
  sidebarCollapsed: boolean
  detectedPorts: Record<string, number>
  setActiveProject: (id: string) => void
  addProject: (path: string) => GlyphProject
  removeProject: (id: string) => void
  updateProject: (id: string, fields: Partial<Pick<GlyphProject, 'name' | 'devCommand' | 'icon' | 'faviconUrl'>>) => void
  setProjectLayout: (id: string, layout: ProjectLayout) => void
  setProjectIcon: (id: string, icon: string) => void
  toggleSidebar: () => void
  setDetectedPort: (projectId: string, port: number) => void
  clearDetectedPort: (projectId: string) => void
}

let nextPort = 3000

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  activeProjectId: null,
  sidebarCollapsed: false,
  detectedPorts: {},

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
      faviconUrl: null,
      devCommand: null,
      openFiles: [],
      activeFile: null,
      layout: 'horizontal',
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

  updateProject: (id, fields) =>
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? { ...p, ...fields } : p)),
    })),

  setProjectLayout: (id, layout) =>
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? { ...p, layout } : p)),
    })),

  setProjectIcon: (id, icon) =>
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? { ...p, icon } : p)),
    })),

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setDetectedPort: (projectId, port) =>
    set((state) => ({ detectedPorts: { ...state.detectedPorts, [projectId]: port } })),

  clearDetectedPort: (projectId) =>
    set((state) => {
      const { [projectId]: _, ...rest } = state.detectedPorts
      return { detectedPorts: rest }
    }),
}))

export const useActiveProject = () => {
  const { projects, activeProjectId } = useProjectStore()
  return projects.find((p) => p.id === activeProjectId) ?? null
}
