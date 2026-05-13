import axios from 'axios'

const API = process.env.NEXT_PUBLIC_BACK_URL

const api = axios.create({ baseURL: API })

// ── Request interceptor: adjunta el access token a cada request ──────────────
api.interceptors.request.use(config => {
    if (typeof window === 'undefined') return config
    try {
        const session = JSON.parse(localStorage.getItem('credentials'))
        if (session?.tokens?.access) {
            config.headers.Authorization = `Bearer ${session.tokens.access}`
        }
    } catch {
        // localStorage corrupto — se ignora, el 401 del servidor lo manejará
    }
    return config
})

// ── Response interceptor: refresh automático ante 401 ───────────────────────
let isRefreshing = false
let pendingQueue = []  // requests que esperan el nuevo token

const resolveQueue = (token) => {
    pendingQueue.forEach(({ resolve }) => resolve(token))
    pendingQueue = []
}

const rejectQueue = (error) => {
    pendingQueue.forEach(({ reject }) => reject(error))
    pendingQueue = []
}

const clearSession = () => {
    localStorage.removeItem('credentials')
    // Elimina la cookie que usa el middleware de Next.js
    document.cookie = 'taskmanager_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'
    window.location.href = '/Home'
}

api.interceptors.response.use(
    res => res,
    async error => {
        const original = error.config

        if (error.response?.status !== 401 || original._retry) {
            return Promise.reject(error)
        }

        // Si ya hay un refresh en curso, encolar el request fallido
        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                pendingQueue.push({ resolve, reject })
            }).then(newToken => {
                original.headers.Authorization = `Bearer ${newToken}`
                return api(original)
            })
        }

        original._retry = true
        isRefreshing = true

        try {
            const session = JSON.parse(localStorage.getItem('credentials'))
            const refreshToken = session?.tokens?.refresh
            if (!refreshToken) throw new Error('no refresh token')

            const { data } = await axios.post(`${API}/token/refresh/`, { refresh: refreshToken })
            const newAccess = data.access
            const newRefresh = data.refresh ?? refreshToken  // simplejwt rota el refresh si ROTATE_REFRESH_TOKENS=True

            const updated = { ...session, tokens: { access: newAccess, refresh: newRefresh } }
            localStorage.setItem('credentials', JSON.stringify(updated))

            resolveQueue(newAccess)
            original.headers.Authorization = `Bearer ${newAccess}`
            return api(original)
        } catch (refreshError) {
            rejectQueue(refreshError)
            clearSession()
            return Promise.reject(refreshError)
        } finally {
            isRefreshing = false
        }
    }
)

export default api
