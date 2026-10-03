import axiosInstance from './axiosConfig'

// Matches VMCI.Scanner.WebApi's SessionDto (camelCase). The login itself is an HttpOnly cookie the
// browser keeps and sends; the frontend never sees or stores a token.
export interface Session {
  accountId: string
  email: string
  firstName: string
  surName: string
  isAdmin: boolean
  // Still on the temporary password an administrator set: the app shows nothing but the form to
  // choose an own password.
  mustChangePassword: boolean
}

export const authService = {
  async login(email: string, password: string): Promise<Session> {
    const { data } = await axiosInstance.post<Session>('/auth/login', { email, password })
    return data
  },

  async logout(): Promise<void> {
    await axiosInstance.post('/auth/logout')
  },

  /** The current session, or null when this device is not signed in. */
  async me(): Promise<Session | null> {
    try {
      const { data } = await axiosInstance.get<Session>('/auth/me')
      return data
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response?.status
      if (status === 401) return null
      throw err
    }
  },
}
