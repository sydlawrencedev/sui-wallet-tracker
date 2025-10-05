const isServer = typeof window === 'undefined';

export function getApiUrl(path: string): string {
  if (isServer) {
    // When running on the server, use an absolute URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `${baseUrl}${path}`;
  }
  // In the browser, use relative URL
  return path;
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = getApiUrl(path);
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'API request failed');
  }
  
  return response.json();
}
