import client from './client'

export const getWidgets       = pageId => client.get(`/pages/${pageId}/widgets`).then(r => r.data.data)
export const getWidget        = id => client.get(`/widgets/${id}`).then(r => r.data.data)
export const createWidget     = (pageId, data) => client.post(`/pages/${pageId}/widgets`, data).then(r => r.data)
export const updateWidget     = (id, data) => client.put(`/widgets/${id}`, data).then(r => r.data)
export const deleteWidget     = id => client.delete(`/widgets/${id}`).then(r => r.data)
export const bulkUpdateLayout = items => client.post('/widgets/layout', items).then(r => r.data)
export const previewWidget    = (widgetType, config) =>
  client.post('/widgets/preview', { widget_type: widgetType, config }).then(r => r.data)
