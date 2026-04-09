import { create } from 'zustand'

interface ModalStore {
  quickStartOpen: boolean
  openQuickStart: () => void
  closeQuickStart: () => void
  cloneOpen: boolean
  openClone: () => void
  closeClone: () => void
}

export const useModalStore = create<ModalStore>((set) => ({
  quickStartOpen: false,
  openQuickStart: () => set({ quickStartOpen: true }),
  closeQuickStart: () => set({ quickStartOpen: false }),
  cloneOpen: false,
  openClone: () => set({ cloneOpen: true }),
  closeClone: () => set({ cloneOpen: false }),
}))
