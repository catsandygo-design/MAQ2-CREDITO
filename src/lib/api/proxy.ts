type RequestBody = BodyInit | Record<string, unknown> | null | undefined;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export function apiUrl(path: string) {
  if (typeof window !== 'undefined') return path;
  if (API_BASE_URL) return `${API_BASE_URL}${path}`;
  return path;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function serializeBody(body: RequestBody) {
  if (!body || body instanceof FormData || typeof body === 'string') return body;
  return JSON.stringify(body);
}

export const apiClient = {
  get: <T>(path: string, init?: RequestInit) => request<T>(path, { ...init, method: 'GET' }),
  post: <T>(path: string, body?: RequestBody, init?: RequestInit) => request<T>(path, { ...init, method: 'POST', body: serializeBody(body) }),
  put: <T>(path: string, body?: RequestBody, init?: RequestInit) => request<T>(path, { ...init, method: 'PUT', body: serializeBody(body) }),
  delete: <T>(path: string, init?: RequestInit) => request<T>(path, { ...init, method: 'DELETE' }),
};
