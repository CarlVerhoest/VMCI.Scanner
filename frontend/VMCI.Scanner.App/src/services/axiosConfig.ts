import axios from 'axios'
import { tokenService } from './tokenService'
import { beginHttpRequest, endHttpRequest } from '../hooks/useHttpActivity'

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add the JWT bearer token, if we have one, and to mark the request as
// in flight for the app-wide loading spinner (see useHttpActivity.ts). Every axiosInstance
// call is covered automatically - no per-call opt-in needed.
axiosInstance.interceptors.request.use(
  (config) => {
    const token = tokenService.getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    beginHttpRequest()
    return config
  },
  (error) => {
    endHttpRequest()
    return Promise.reject(error)
  }
)

// Response interceptor for centralized 401 handling, and for clearing the in-flight marker set
// by the request interceptor above (both on success and on failure).
axiosInstance.interceptors.response.use(
  (response) => {
    endHttpRequest()
    return response
  },
  (error) => {
    endHttpRequest()

    if (error.response?.status === 401) {
      // Don't redirect if this is the login request itself - let the login page
      // handle and display that error instead of bouncing the user away from it.
      const isLoginRequest = Boolean(error.config?.url?.includes('/auth/login'))
      if (!isLoginRequest) {
        tokenService.clearToken()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default axiosInstance
