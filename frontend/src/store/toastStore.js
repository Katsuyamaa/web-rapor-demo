import { create } from 'zustand'

let nextId = 0

const useToastStore = create((set) => ({
  toasts: [],
  show: (message, type = 'info', duration = 3500) => {
    const id = ++nextId
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => {
      set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }))
    }, duration)
  },
  dismiss: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}))

export default useToastStore
