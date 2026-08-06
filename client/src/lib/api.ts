const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export function getStoredToken(): string | null {
  return localStorage.getItem('prepsense_jwt_token');
}

export function setStoredToken(token: string): void {
  localStorage.setItem('prepsense_jwt_token', token);
}

export function removeStoredToken(): void {
  localStorage.removeItem('prepsense_jwt_token');
}

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status} Error`;
    try {
      const data = await response.json();
      if (data.error) errorMessage = data.error;
    } catch {
      // JSON parse fallback
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}
