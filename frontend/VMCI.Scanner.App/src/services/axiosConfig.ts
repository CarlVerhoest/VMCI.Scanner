import axios from 'axios'
import { beginHttpRequest, endHttpRequest } from '../hooks/useHttpActivity'

// Same origin as the API (served by it in production, proxied by Vite in development), so the
// browser sends the HttpOnly login cookie on every call by itself.
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// AuthContext registers what to do when the server says the session is gone (401) or that the
// user must first replace a temporary password (403 PASSWORD_CHANGE_REQUIRED).
type Handlers = { onUnauthorized: () => void; onPasswordChangeRequired: () => void }
let handlers: Handlers = { onUnauthorized: () => undefined, onPasswordChangeRequired: () => undefined }

export function setSessionHandlers(next: Handlers): void {
  handlers = next
}

// Marks every request as in flight for the app-wide loading spinner (see useHttpActivity.ts).
axiosInstance.interceptors.request.use(
  (config) => {
    beginHttpRequest()
    return config
  },
  (error) => {
    endHttpRequest()
    return Promise.reject(error)
  }
)

axiosInstance.interceptors.response.use(
  (response) => {
    endHttpRequest()
    return response
  },
  (error) => {
    endHttpRequest()

    const status = error.response?.status
    const url: string = error.config?.url ?? ''
    // The login and the startup session check handle their own 401.
    const handlesOwn401 = url.includes('/auth/login') || url.includes('/auth/me')

    if (status === 401 && !handlesOwn401) {
      handlers.onUnauthorized()
    } else if (status === 403 && error.response?.data?.code === 'PASSWORD_CHANGE_REQUIRED') {
      handlers.onPasswordChangeRequired()
    }
    return Promise.reject(error)
  }
)

export default axiosInstance
