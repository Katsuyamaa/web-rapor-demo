import { create } from 'zustand'

const useAlarmStore = create((set) => ({
  unreadCount: 0,
  setUnreadCount: (n) => set({ unreadCount: n }),
  decrement: () => set((s) => ({ unreadCount: Math.max(0, s.unreadCount - 1) })),
  clear: () => set({ unreadCount: 0 }),
}))

export default useAlarmStore
