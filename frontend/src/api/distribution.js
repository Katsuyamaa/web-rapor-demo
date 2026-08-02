import client from './client'

export const getTemplates = () => client.get('/dist/templates')

export const createTemplate = (data) => client.post('/dist/templates', data)

export const deleteTemplate = (id) => client.delete(`/dist/templates/${id}`)

export const uploadTemplateFile = (id, file) => {
  const fd = new FormData()
  fd.append('file', file)
  return client.post(`/dist/templates/${id}/upload-file`, fd, {
    headers: { 'Content-Type': undefined },
  })
}

export const templateHasFile = (id) => client.get(`/dist/templates/${id}/has-file`)

export const getTemplateProducts = (id) => client.get(`/dist/templates/${id}/products`)

export const updateTemplateProducts = (id, products) =>
  client.put(`/dist/templates/${id}/products`, { products })

export const getRuts = () => client.get('/dist/ruts')

export const saveRut = (data) => client.post('/dist/ruts', data)

export const updateRut = (id, data) => client.put(`/dist/ruts/${id}`, data)

export const deleteRut = (id) => client.delete(`/dist/ruts/${id}`)

export const importXlsm = (file) => {
  const fd = new FormData()
  fd.append('file', file)
  return client.post('/dist/import', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const generateList = (date, templates) =>
  client.post('/dist/generate', { date, templates }, { responseType: 'blob' })
