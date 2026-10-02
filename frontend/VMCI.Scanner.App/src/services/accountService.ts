import axiosInstance from './axiosConfig'

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

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await axiosInstance.post('/account/me/change-password', {
      currentPassword,
      newPassword,
    })
  },
}
