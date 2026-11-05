const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return null;

  const response = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!response.ok) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
    return null;
  }

  const result = await response.json();
  if (!result.access_token) {
    throw new ApiError('Token refresh response did not contain an access token', response.status);
  }
  localStorage.setItem('access_token', result.access_token);
  return result.access_token;
}

export async function apiRequest(endpoint, options = {}) {
  const { _isRetry = false, ...fetchOptions } = options;
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  const headers = new Headers(fetchOptions.headers || {});
  if (!headers.has('Content-Type') && fetchOptions.body && !(fetchOptions.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = localStorage.getItem('access_token');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response;
  try {
    response = await fetch(url, { ...fetchOptions, headers });
  } catch (error) {
    throw new ApiError(error.message || 'Could not connect to the API', 0);
  }

  if (response.status === 401 && !_isRetry && localStorage.getItem('refresh_token')) {
    let newToken;
    try {
      newToken = await refreshAccessToken();
    } catch (error) {
      throw error instanceof ApiError ? error : new ApiError('Could not refresh the login session', 0);
    }
    if (newToken) {
      return apiRequest(endpoint, {
        ...fetchOptions,
        _isRetry: true,
        headers: { ...Object.fromEntries(headers.entries()), Authorization: `Bearer ${newToken}` },
      });
    }
  }

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : null;
  if (!response.ok) {
    const message = data?.detail || data?.message || `HTTP ${response.status}: ${response.statusText}`;
    throw new ApiError(message, response.status, data);
  }
  return data;
}

export async function apiDownload(endpoint, filename) {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  const token = localStorage.getItem('access_token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const data = response.headers.get('content-type')?.includes('application/json')
      ? await response.json()
      : null;
    throw new ApiError(data?.detail || `HTTP ${response.status}: ${response.statusText}`, response.status, data);
  }

  const blobUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(blobUrl);
}

export default apiRequest;
