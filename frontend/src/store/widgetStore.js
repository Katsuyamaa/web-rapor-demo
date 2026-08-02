import { create } from 'zustand'
import { getWidgets, createWidget, deleteWidget, bulkUpdateLayout } from '../api/widgets'

const useWidgetStore = create((set, get) => ({
  widgetsByPage: {},
  isLoading: false,

  fetchWidgets: async (pageId) => {
    set({ isLoading: true })
    try {
      const widgets = await getWidgets(pageId)
      set(state => ({
        widgetsByPage: { ...state.widgetsByPage, [pageId]: widgets },
        isLoading: false
      }))
      return widgets
    } catch (e) {
      console.error(e)
      set({ isLoading: false })
      return []
    }
  },

  addWidget: async (pageId, data) => {
    try {
      const result = await createWidget(pageId, data)
      await get().fetchWidgets(pageId)
      return result
    } catch (e) {
      console.error(e)
    }
  },

  removeWidget: async (pageId, widgetId) => {
    try {
      await deleteWidget(widgetId)
      await get().fetchWidgets(pageId)
    } catch (e) {
      console.error(e)
    }
  },

  saveLayout: async (pageId, gridItems) => {
    try {
      const items = gridItems.map(i => ({
        id: parseInt(i.id), x: i.x, y: i.y, w: i.w, h: i.h
      }))
      await bulkUpdateLayout(items)
    } catch (e) {
      console.error(e)
    }
  },
}))

export default useWidgetStore
