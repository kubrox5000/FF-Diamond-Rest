export type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: string
}

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  // Incident guard (2026-07): this module is imported by Client Components.
  // Do not import database or server-only env modules here. A previous `./env`
  // import eagerly validated DATABASE_URL in the browser and crashed rendering.
  const baseUrl = typeof window === 'undefined'
    ? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:13000'
    : window.location.origin

  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`

  try {
    const headers = new Headers(options.headers)
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

    const response = await fetch(fullUrl, {
      ...options,
      headers,
    })

    const data = await response.json() as ApiResponse<T> & { data?: T }
    if (!response.ok || data.success === false) {
      return {
        success: false,
        error: data.error || response.statusText,
      }
    }

    return {
      success: true,
      data: data.success === true && 'data' in data ? data.data : data as unknown as T,
    }
  } catch (error) {
    console.error(`Fetch error for ${fullUrl}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export const apiClient = {
  get: <T>(url: string, options?: RequestInit) => 
    request<T>(url, { ...options, method: 'GET' }),
  post: <T>(url: string, body: any, options?: RequestInit) => 
    request<T>(url, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: <T>(url: string, body: any, options?: RequestInit) => 
    request<T>(url, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(url: string, options?: RequestInit) => 
    request<T>(url, { ...options, method: 'DELETE' }),
}
