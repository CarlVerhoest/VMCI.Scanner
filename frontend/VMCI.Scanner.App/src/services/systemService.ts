import axiosInstance from './axiosConfig'

// Matches VMCI.Scanner.WebApi's EnvironmentDto (GET api/info/environment, anonymous). Lets the
// frontend gate dev-only UI (e.g. EmployeeList's "delete all" button) on the backend's real
// ASPNETCORE_ENVIRONMENT rather than guessing from the hostname/URL - the endpoint itself it
// gates re-checks IsDevelopment() server-side regardless, so this is purely about what to show.
export interface EnvironmentInfo {
  isDevelopment: boolean
}

export const systemService = {
  async getEnvironment(): Promise<EnvironmentInfo> {
    const { data } = await axiosInstance.get<EnvironmentInfo>('/info/environment')
    return data
  },
}
