import { apiRequest } from './client';

export function listUsersApi(params = {}) {
  const query = new URLSearchParams(params);
  return apiRequest(`/users${query.size ? `?${query}` : ''}`);
}

export function listStudentsApi() {
  return apiRequest('/users/students');
}

export function createStudentApi(data) {
  return apiRequest('/users/students', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function createTeacherApi(data) {
  return apiRequest('/users/teachers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getUserApi(userId) {
  return apiRequest(`/users/${userId}`);
}
