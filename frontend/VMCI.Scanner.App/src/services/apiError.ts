import axios from 'axios'

// Extracts a human-readable message from a failed API call: the API's own `{ message: "..." }`
// bodies (Dutch), or ASP.NET Core's ValidationProblemDetails (`errors`/`title`). Anything else -
// no response at all, a 500 - gets the Dutch fallback rather than axios's English
// "Request failed with status code ...".
export function getErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) return 'Geen verbinding met de server. Controleer uw internetverbinding.'

    const data = err.response.data as
      | { message?: string; title?: string; errors?: Record<string, string[]> }
      | undefined

    if (data?.message) return data.message
    if (data?.errors) {
      const firstError = Object.values(data.errors)[0]?.[0]
      if (firstError) return firstError
    }
    return fallback
  }

  return fallback
}
