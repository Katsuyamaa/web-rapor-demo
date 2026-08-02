import { create } from 'zustand'

const useDialogStore = create((set) => ({
  confirmState: null,
  promptState: null,

  confirm: (message, title = 'Onay') => new Promise((resolve) => {
    set({ confirmState: { message, title, resolve } })
  }),

  prompt: (message, title = 'Giriş', defaultValue = '') => new Promise((resolve) => {
    set({ promptState: { message, title, resolve, defaultValue } })
  }),

  closeConfirm: (result) => set((state) => {
    if (state.confirmState?.resolve) state.confirmState.resolve(result)
    return { confirmState: null }
  }),

  closePrompt: (result) => set((state) => {
    if (state.promptState?.resolve) state.promptState.resolve(result)
    return { promptState: null }
  }),
}))

export const confirmDialog = useDialogStore.getState().confirm
export const promptDialog = useDialogStore.getState().prompt

export default useDialogStore
