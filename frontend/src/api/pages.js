import client from './client'

export const getPageTree = () => client.get('/pages/tree').then(r => r.data.data)
export const getPage     = slug => client.get(`/pages/${slug}`).then(r => r.data.data)
export const createPage  = data => client.post('/pages', data).then(r => r.data)
export const updatePage  = (id, data) => client.put(`/pages/${id}`, data).then(r => r.data)
export const deletePage  = id   => client.delete(`/pages/${id}`).then(r => r.data)
