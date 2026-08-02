import { create } from 'zustand'

const useSupportStore = create((set) => ({
  open: false,
  toggle: () => set(s => ({ open: !s.open })),
  setOpen: (v) => set({ open: v }),
}))

export default useSupportStore
