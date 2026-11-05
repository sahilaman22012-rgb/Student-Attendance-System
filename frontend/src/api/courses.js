import { apiRequest } from './client';

export function listCoursesApi() {
  return apiRequest('/courses');
}

export function createCourseApi(courseData) {
  return apiRequest('/courses', {
    method: 'POST',
    body: JSON.stringify(courseData),
  });
}

export function enrollStudentApi(courseId, studentId) {
  return apiRequest(`/courses/${courseId}/enroll`, {
    method: 'POST',
    body: JSON.stringify({ student_id: studentId }),
  });
}

export function getCourseStudentsApi(courseId) {
  return apiRequest(`/courses/${courseId}/students`);
}
