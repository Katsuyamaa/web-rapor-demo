import { create } from 'zustand'
import { login as apiLogin, logout as apiLogout } from '../api/auth'

const TOKEN_KEY = 'demo_token'
const USER_KEY  = 'demo_user'

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const storedToken = (() => {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
})()
const storedUser = storedToken ? readStoredUser() : null

// Demo sürümü: gerçek JWT/HttpOnly-cookie doğrulaması yerine, localStorage'da
// tutulan sahte bir bearer token ile client-side oturum yönetimi yapılır.
// ProtectedRoute yalnızca isAuthenticated bayrağına bakar, gerçek doğrulama yapmaz.
const useAuthStore = create((set, get) => ({
  user: storedUser,
  permissions: [],
  isAuthenticated: !!storedToken,
  isLoading: false,

  // Geriye dönük uyumluluk için tutuluyor (router artık init() beklemiyor).
  init: async () => {
    set({ isLoading: false })
  },

  login: async (username, password) => {
    let token, user

    try {
      const data = await apiLogin(username, password)
      token = data.token
      user  = data.user
    } catch (err) {
      // Backend erişilemezse veya hata dönerse, demo/demo için yerel sahte girişe izin ver
      // — böylece portfolyo demosu bağımsız bir backend olmadan da açılabilir.
      if (username === 'demo' && password === 'demo') {
        token = 'demo-local-token'
        user  = { username: 'demo', role: 'admin' }
      } else {
        throw err
      }
    }

    try {
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(USER_KEY, JSON.stringify(user))
    } catch {}

    set({ user, permissions: [], isAuthenticated: true, isLoading: false })
    return user
  },

  logout: async () => {
    try { await apiLogout() } catch {}
    try {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    } catch {}
    set({ user: null, permissions: [], isAuthenticated: false })
  },

  hasRole: (...roles) => roles.includes(get().user?.role),
  hasPermission: (key) => {
    const { user, permissions } = get()
    if (user?.role === 'admin') return true
    return permissions.includes(key)
  },
}))

export default useAuthStore
