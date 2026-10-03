import axiosInstance from './axiosConfig'
import type { Session } from './authService'

// Matches VMCI.Scanner.WebApi's AccountProfileDto (camelCase - see Program.cs's
// JsonNamingPolicy.CamelCase configuration). Role fields are display-only; there is no
// request DTO anywhere in this module that can carry a role change.
export interface AccountProfile {
  firstName: string
  surName: string
  email: string
  roleCode: string
  roleName: string
}

export const accountService = {
  async getProfile(): Promise<AccountProfile> {
    const { data } = await axiosInstance.get<AccountProfile>('/account/me')
    return data
  },

  async updateProfile(firstName: string, surName: string): Promise<AccountProfile> {
    const { data } = await axiosInstance.put<AccountProfile>('/account/me', {
      firstName,
      surName,
    })
    return data
  },

  // Also the forced change of a temporary password. Signs the account out on every other device;
  // this device gets a fresh cookie and the updated session back.
  async changePassword(currentPassword: string, newPassword: string): Promise<Session> {
    const { data } = await axiosInstance.post<Session>('/account/me/change-password', {
      currentPassword,
      newPassword,
    })
    return data
  },
}
