import axiosInstance from './axiosConfig'
import type { Recipient } from './recipientService'

// Matches VMCI.Scanner.WebApi's AdminAccountDto / RoleDto (camelCase).
export interface AdminAccount {
  id: string
  email: string
  firstName: string
  surName: string
  roleCode: string
  roleName: string
  isLocked: boolean
  mustChangePassword: boolean
}

export interface Role {
  code: string
  name: string
}

export interface AccountFields {
  email: string
  firstName: string
  surName: string
  roleCode: string
}

// Must match AdminPasswordRules.MinTemporaryLength in the API.
export const MIN_TEMPORARY_PASSWORD_LENGTH = 4

export const adminService = {
  async getAccounts(): Promise<AdminAccount[]> {
    const { data } = await axiosInstance.get<AdminAccount[]>('/admin/accounts')
    return data
  },

  async getAccount(id: string): Promise<AdminAccount> {
    const { data } = await axiosInstance.get<AdminAccount>(`/admin/accounts/${id}`)
    return data
  },

  async getRoles(): Promise<Role[]> {
    const { data } = await axiosInstance.get<Role[]>('/admin/roles')
    return data
  },

  async createAccount(fields: AccountFields, temporaryPassword: string): Promise<AdminAccount> {
    const { data } = await axiosInstance.post<AdminAccount>('/admin/accounts', {
      ...fields,
      temporaryPassword,
    })
    return data
  },

  async updateAccount(id: string, fields: AccountFields): Promise<AdminAccount> {
    const { data } = await axiosInstance.put<AdminAccount>(`/admin/accounts/${id}`, fields)
    return data
  },

  async resetPassword(id: string, temporaryPassword: string): Promise<AdminAccount> {
    const { data } = await axiosInstance.post<AdminAccount>(`/admin/accounts/${id}/reset-password`, {
      temporaryPassword,
    })
    return data
  },

  async setLocked(id: string, locked: boolean): Promise<AdminAccount> {
    const { data } = await axiosInstance.post<AdminAccount>(
      `/admin/accounts/${id}/${locked ? 'lock' : 'unlock'}`
    )
    return data
  },

  async getRecipients(id: string): Promise<Recipient[]> {
    const { data } = await axiosInstance.get<Recipient[]>(`/admin/accounts/${id}/recipients`)
    return data
  },

  async addRecipient(id: string, email: string, label: string | null): Promise<Recipient> {
    const { data } = await axiosInstance.post<Recipient>(`/admin/accounts/${id}/recipients`, {
      email,
      label,
    })
    return data
  },

  async removeRecipient(id: string, recipientId: string): Promise<void> {
    await axiosInstance.delete(`/admin/accounts/${id}/recipients/${recipientId}`)
  },
}
