import { apiRequest } from './client';

export async function loginApi(email, password) {
  const result = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem('access_token', result.access_token);
  if (result.refresh_token) {
    localStorage.setItem('refresh_token', result.refresh_token);
  }
  localStorage.setItem('user_data', JSON.stringify(result.user));
  return result;
}

export async function getMeApi() {
  return apiRequest('/auth/me');
}

export function changePasswordApi(currentPassword, newPassword) {
  return apiRequest('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
}
