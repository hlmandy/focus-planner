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

function tryParseJson(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null
  } catch {
    return null
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    headers: { 'content-type': 'application/json', ...init?.headers },
    ...init,
  })

  const text = await response.text()
  const body = tryParseJson(text) as Record<string, unknown> | null

  if (!response.ok) {
    const error = body?.error
    const errorMsg =
      typeof error === 'string'
        ? error
        : typeof error === 'object' && error !== null && 'message' in error
          ? String((error as Record<string, unknown>).message)
          : `API error ${response.status}`
    throw new ApiError(response.status, errorMsg)
  }

  return body as T
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
