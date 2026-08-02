import axios from 'axios'

let loadingCount = 0
const loadingListeners = new Set()

export function subscribeLoading(fn) {
  loadingListeners.add(fn)
  return () => loadingListeners.delete(fn)
}

function notifyLoading() {
  const isLoading = loadingCount > 0
  loadingListeners.forEach(fn => fn(isLoading))
}

// Demo sürümü: gerçek backend'de JWT refresh/CSRF çerez akışı vardı.
// Bu portfolyo demosunda stateless bir sahte token kullanılıyor —
// localStorage'daki bearer token her isteğe eklenir, 401 alınca /login'e yönlendirilir.
const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use(config => {
  const token = localStorage.getItem('demo_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  loadingCount++
  notifyLoading()
  return config
})

client.interceptors.response.use(
  res => {
    loadingCount = Math.max(0, loadingCount - 1)
    notifyLoading()
    return res
  },
  err => {
    loadingCount = Math.max(0, loadingCount - 1)
    notifyLoading()
    if (err.response?.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('demo_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default client
