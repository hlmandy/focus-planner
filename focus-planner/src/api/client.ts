// Thin fetch wrapper — all API calls go through here

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

/** Log API errors to console (used as .catch() handler to avoid silent failures) */
export function reportApiError(error: unknown) {
  if (error instanceof ApiError) {
    console.error(`API error ${error.status}: ${error.message}`)
  } else if (error instanceof Error) {
    console.error(`Unexpected error: ${error.message}`)
  } else {
    console.error('Unknown error:', error)
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    headers: { 'content-type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!response.ok) {
    const text = await response.text()
    let errorMsg = `API error ${response.status}`
    if (text) {
      try {
        const body = JSON.parse(text) as Record<string, unknown>
        errorMsg =
          typeof body.error === 'string'
            ? body.error
            : typeof body.error === 'object' && body.error !== null && 'message' in body.error
              ? String((body.error as Record<string, unknown>).message)
              : errorMsg
      } catch {
        /* non-JSON error body — use default message */
      }
    }
    throw new ApiError(response.status, errorMsg)
  }
  // Handle empty responses (e.g. 204 No Content)
  const text = await response.text()
  return text ? (JSON.parse(text) as T) : (null as T)
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path: string) => request<{ ok: true }>(path, { method: 'DELETE' }),
}
