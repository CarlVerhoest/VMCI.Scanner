// localStorage-backed JWT storage. Key name is namespaced to this app to avoid
// clashing with any other app sharing the same origin during local development.
const TOKEN_STORAGE_KEY = 'scanner_token'

export interface TokenClaims {
  accountId: string
  isAdmin: boolean
}

export const tokenService = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_STORAGE_KEY)
  },

  setToken(token: string): void {
    localStorage.setItem(TOKEN_STORAGE_KEY, token)
  },

  clearToken(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  },

  isAuthenticated(): boolean {
    return this.getToken() !== null
  },

  // Reads the accountId ("nameid") and IsAdmin claims out of a JWT's payload, purely for
  // rehydrating UI state (e.g. AuthContext on page load) - this is NOT a security check, the
  // token's signature is never verified client-side. The backend independently validates the
  // token's signature/expiry on every real API call regardless of what this returns.
  decodeClaims(token: string): TokenClaims | null {
    try {
      const payloadSegment = token.split('.')[1]
      const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/')
      const json = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
          .join('')
      )
      const payload = JSON.parse(json) as Record<string, unknown>

      const accountId = payload.nameid
      const isAdmin = payload.IsAdmin

      if (typeof accountId !== 'string') return null

      // The "IsAdmin" claim's value is a C# bool.ToString() ("True"/"False", capitalized) - not
      // the lowercase "true"/"false" JSON's own boolean literals use, since it's embedded as a
      // JWT claim string, not serialized as JSON. Case-insensitive here to not depend on that
      // capitalization, the same way .NET's own bool.TryParse (used server-side to read this
      // same claim back) already isn't case-sensitive either.
      return { accountId, isAdmin: isAdmin === true || String(isAdmin).toLowerCase() === 'true' }
    } catch {
      return null
    }
  },
}
