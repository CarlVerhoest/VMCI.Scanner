import axiosInstance from './axiosConfig'

// Matches VMCI.Scanner.WebApi's RecipientDto. A user adds their own recipients; only an
// administrator removes one.
export interface Recipient {
  id: string
  email: string
  label: string | null
}

export function recipientDisplayName(recipient: Recipient): string {
  return recipient.label ? `${recipient.label} (${recipient.email})` : recipient.email
}

export const recipientService = {
  async getMine(): Promise<Recipient[]> {
    const { data } = await axiosInstance.get<Recipient[]>('/recipients')
    return data
  },

  async add(email: string, label: string | null): Promise<Recipient> {
    const { data } = await axiosInstance.post<Recipient>('/recipients', { email, label })
    return data
  },
}
