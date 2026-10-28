const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';
export const WS_URL = import.meta.env.VITE_WS_URL ?? 'http://localhost:3000';

export function authToken() {
  return localStorage.getItem('pairforge_token');
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set('Content-Type', 'application/json');
  const token = authToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof body.error === 'string' ? body.error : 'Request failed');
  }
  return body as T;
}
