import { apiRequest } from './client';

export function createAttendanceSessionApi(sessionData) {
  return apiRequest('/attendance/sessions', {
    method: 'POST',
    body: JSON.stringify(sessionData),
  });
}

export function getAttendanceSessionsApi() {
  return apiRequest('/attendance/sessions');
}

export function getCurrentQrTokenApi(sessionId) {
  return apiRequest(`/attendance/sessions/${sessionId}/token`);
}

export function endAttendanceSessionApi(sessionId) {
  return apiRequest(`/attendance/sessions/${sessionId}/end`, { method: 'POST' });
}

export function submitManualAttendanceApi(data) {
  return apiRequest('/attendance/manual', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function scanQrTokenApi(sessionId, nonce, deviceId) {
  return apiRequest(`/attendance/sessions/${sessionId}/scan`, {
    method: 'POST',
    body: JSON.stringify({ nonce, device_id: deviceId }),
  });
}

export function getStudentAttendanceSummaryApi() {
  return apiRequest('/attendance/me/summary');
}

export function getStudentAttendanceLogsApi() {
  return apiRequest('/attendance/me/logs');
}

export function getCourseRosterAnalyticsApi(courseId) {
  return apiRequest(`/analytics/course/${courseId}/roster`);
}

export function getCourseSummaryApi(courseId) {
  return apiRequest(`/analytics/course/${courseId}/summary`);
}

export function getCourseReportUrl(courseId, format = 'csv') {
  return `/api/v1/reports/course/${courseId}/export?format=${format}`;
}
