import { create } from 'zustand'
import { getPageTree, getPage, createPage, updatePage, deletePage } from '../api/pages'

const usePageStore = create((set, get) => ({
  tree: [],
  activePage: null,
  isLoading: false,

  fetchTree: async () => {
    const tree = await getPageTree()
    set({ tree })
  },

  fetchPage: async (slug) => {
    set({ isLoading: true })
    try {
      const page = await getPage(slug)
      set({ activePage: page, isLoading: false })
      return page
    } catch {
      set({ isLoading: false })
      throw new Error('Sayfa bulunamadı')
    }
  },

  createPage: async (data) => {
    const result = await createPage(data)
    await get().fetchTree()
    return result
  },

  updatePage: async (id, data) => {
    const result = await updatePage(id, data)
    await get().fetchTree()
    return result
  },

  deletePage: async (id) => {
    await deletePage(id)
    await get().fetchTree()
  },

  findBySlug: (slug) => {
    return get().tree.find(p => p.slug === slug) || null
  },

  getBreadcrumb: (page) => {
    if (!page || !page.path) return []
    const tree = get().tree
    const parts = page.path.replace(/^\/|\/$/g, '').split('/').filter(Boolean)
    return parts.map(id => tree.find(p => p.id === parseInt(id))).filter(Boolean)
  },
}))

export default usePageStore
