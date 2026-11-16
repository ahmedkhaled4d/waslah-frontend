import type { ApiErrorBody } from '@/types/api'

const TOKEN_KEY = 'waslah.token'
const EXPIRES_KEY = 'waslah.tokenExpiresAt'

/** Base URL of the API (API Gateway stage URL). Empty string means same origin. */
export const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') ?? ''

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: Record<string, unknown>

  constructor(status: number, code: string, message: string, details: Record<string, unknown> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }

  /** Field errors from a VALIDATION_ERROR response, keyed by field path. */
  get fields(): Record<string, string> {
    const fields = this.details['fields']
    if (fields && typeof fields === 'object') return fields as Record<string, string>
    return {}
  }
}

export const tokenStore = {
  get(): string | null {
    const token = localStorage.getItem(TOKEN_KEY)
    const expiresAt = localStorage.getItem(EXPIRES_KEY)
    if (!token) return null
    if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
      tokenStore.clear()
      return null
    }
    return token
  },
  set(token: string, expiresAt: string) {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(EXPIRES_KEY, expiresAt)
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(EXPIRES_KEY)
  },
}

type UnauthorizedListener = () => void
const unauthorizedListeners = new Set<UnauthorizedListener>()

/** Called when any request returns 401; the auth provider uses it to log the user out. */
export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener)
  return () => unauthorizedListeners.delete(listener)
}

export type QueryParams = Record<string, string | number | boolean | null | undefined>

function buildQuery(params?: QueryParams): string {
  if (!params) return ''
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  query?: QueryParams
  /** Skip the Authorization header (login). */
  anonymous?: boolean
  signal?: AbortSignal
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (!options.anonymous) {
    const token = tokenStore.get()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}${buildQuery(options.query)}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Check your connection and the API URL.')
  }

  if (response.status === 204) return undefined as T

  const text = await response.text()
  let json: unknown = undefined
  if (text) {
    try {
      json = JSON.parse(text)
    } catch {
      json = undefined
    }
  }

  if (!response.ok) {
    const body = json as Partial<ApiErrorBody> | undefined
    const error = body?.error
    const apiError = new ApiError(
      response.status,
      error?.code ?? `HTTP_${response.status}`,
      error?.message ?? response.statusText ?? 'Request failed',
      error?.details ?? {},
    )
    if (response.status === 401 && !options.anonymous) {
      for (const listener of unauthorizedListeners) listener()
    }
    throw apiError
  }

  return json as T
}

export const api = {
  get: <T>(path: string, query?: QueryParams, signal?: AbortSignal) => request<T>(path, { query, signal }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  delete: <T = void>(path: string) => request<T>(path, { method: 'DELETE' }),
}

/** Human-readable message for any thrown value. */
export function errorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof ApiError) {
    if (error.code === 'VALIDATION_ERROR') {
      const first = Object.entries(error.fields)[0]
      if (first) return `${first[0]}: ${first[1]}`
    }
    return error.message || fallback
  }
  if (error instanceof Error) return error.message || fallback
  return fallback
}
