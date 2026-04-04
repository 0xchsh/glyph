import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SettingsSection = 'general' | 'terminal' | 'editor' | 'appearance'

interface SettingsStore {
  // Navigation
  isOpen: boolean
  activeSection: SettingsSection
  openSettings: (section?: SettingsSection) => void
  closeSettings: () => void
  setSection: (section: SettingsSection) => void

  // Preferences (persisted)
  terminalFontSize: number
  editorFontSize: number
  editorTabSize: number
  editorWordWrap: boolean
  defaultShell: string
  showHiddenFiles: boolean
  autoOpenTerminal: boolean
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      // Navigation state — not persisted but included in store
      isOpen: false,
      activeSection: 'general',

      openSettings: (section = 'general') =>
        set({ isOpen: true, activeSection: section }),

      closeSettings: () => set({ isOpen: false }),

      setSection: (section) => set({ activeSection: section }),

      // Preferences with defaults
      terminalFontSize: 13,
      editorFontSize: 13,
      editorTabSize: 2,
      editorWordWrap: false,
      defaultShell: '',
      showHiddenFiles: false,
      autoOpenTerminal: true,
    }),
    {
      name: 'glyph-settings',
      // Only persist preferences, not navigation state
      partialize: (state) => ({
        terminalFontSize: state.terminalFontSize,
        editorFontSize: state.editorFontSize,
        editorTabSize: state.editorTabSize,
        editorWordWrap: state.editorWordWrap,
        defaultShell: state.defaultShell,
        showHiddenFiles: state.showHiddenFiles,
        autoOpenTerminal: state.autoOpenTerminal,
      }),
    }
  )
)
