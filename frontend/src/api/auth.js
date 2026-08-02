import client from './client'

// Demo sürümü: backend basit bir /api/auth/login uç noktası sunar ve
// { token, user } döner. Gerçek JWT-refresh/CSRF akışı yoktur.
export const login = (username, password) =>
  client.post('/auth/login', { username, password }).then(r => r.data)

export const logout = () => client.post('/auth/logout').catch(() => {})

export const getMe = () => client.get('/auth/me').then(r => r.data)
