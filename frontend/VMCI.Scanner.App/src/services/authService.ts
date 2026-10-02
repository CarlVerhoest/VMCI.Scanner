import axiosInstance from './axiosConfig'

// Matches VMCI.Scanner.WebApi's LoginResponse DTO (camelCase - see Program.cs's
// JsonNamingPolicy.CamelCase configuration).
export interface LoginResult {
  token: string
  accountId: string
  email: string
  firstName: string
  surName: string
  isAdmin: boolean
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResult> {
    const { data } = await axiosInstance.post<LoginResult>('/auth/login', { email, password })
    return data
  },
}
