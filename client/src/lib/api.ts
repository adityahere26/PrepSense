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

/**
 * Sends a multipart/form-data request with the Bearer authorization header attached.
 * Does NOT set Content-Type header so browser automatically sets multipart/form-data with boundary.
 */
export async function uploadMultipartApi<T>(endpoint: string, formData: FormData): Promise<T> {
  const token = getStoredToken();

  if (!token) {
    throw new Error('Not logged in: Authentication token is missing. Please sign in again.');
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(`Authentication error (${response.status}): ${data.error || 'Session expired or invalid token. Please log in again.'}`);
    }
    if (response.status === 400) {
      throw new Error(`Upload Validation Error: ${data.error || 'Invalid request parameters or file.'}`);
    }
    throw new Error(`Upload Failed (${response.status}): ${data.error || 'Server error occurred during upload.'}`);
  }

  return data as T;
}
