import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SettingsSection = 'general' | 'terminal' | 'editor' | 'appearance' | 'project'
export type ColorMode = 'native' | 'light' | 'dark'

interface SettingsStore {
  // Navigation
  isOpen: boolean
  activeSection: SettingsSection
  activeProjectSettingsId: string | null
  openSettings: (section?: SettingsSection) => void
  openProjectSettings: (projectId: string) => void
  closeSettings: () => void
  setSection: (section: SettingsSection) => void

  // Preferences (persisted)
  terminalFontSize: number
  editorFontSize: number
  editorTabSize: number
  editorWordWrap: boolean
  defaultShell: 'shell' | 'claude' | 'codex'
  showHiddenFiles: boolean
  autoOpenTerminal: boolean
  colorMode: ColorMode
  confirmDelete: boolean
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      // Navigation state — not persisted but included in store
      isOpen: false,
      activeSection: 'general',
      activeProjectSettingsId: null,

      openSettings: (section = 'general') =>
        set({ isOpen: true, activeSection: section, activeProjectSettingsId: null }),

      openProjectSettings: (projectId) =>
        set({ isOpen: true, activeSection: 'project', activeProjectSettingsId: projectId }),

      closeSettings: () => set({ isOpen: false, activeProjectSettingsId: null }),

      setSection: (section) => set({ activeSection: section, activeProjectSettingsId: null }),

      // Preferences with defaults
      terminalFontSize: 13,
      editorFontSize: 13,
      editorTabSize: 2,
      editorWordWrap: false,
      defaultShell: 'shell',
      showHiddenFiles: false,
      autoOpenTerminal: true,
      colorMode: 'dark',
      confirmDelete: true,
    }),
    {
      name: 'glyph-settings',
      partialize: (state) => ({
        terminalFontSize: state.terminalFontSize,
        editorFontSize: state.editorFontSize,
        editorTabSize: state.editorTabSize,
        editorWordWrap: state.editorWordWrap,
        defaultShell: state.defaultShell,
        showHiddenFiles: state.showHiddenFiles,
        autoOpenTerminal: state.autoOpenTerminal,
        colorMode: state.colorMode,
        confirmDelete: state.confirmDelete,
      }),
    }
  )
)
