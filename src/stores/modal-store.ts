import { create } from 'zustand'

interface ModalStore {
  quickStartOpen: boolean
  openQuickStart: () => void
  closeQuickStart: () => void
}

export const useModalStore = create<ModalStore>((set) => ({
  quickStartOpen: false,
  openQuickStart: () => set({ quickStartOpen: true }),
  closeQuickStart: () => set({ quickStartOpen: false }),
}))
