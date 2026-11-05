import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { listCoursesApi, getCourseStudentsApi, enrollStudentApi } from '../api/courses';
import { createStudentApi, listStudentsApi } from '../api/users';
import {
  getAttendanceSessionsApi,
  getStudentAttendanceLogsApi,
  getStudentAttendanceSummaryApi,
} from '../api/attendance';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { user, role, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [studentAttendance, setStudentAttendance] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshData = useCallback(async () => {
    if (!isAuthenticated) {
      setCourses([]);
      setStudents([]);
      setSessions([]);
      setAttendanceLogs([]);
      setStudentAttendance([]);
      return;
    }

    setIsLoading(true);
    try {
      const loadedCourses = await listCoursesApi();
      setCourses(loadedCourses);

      if (role === 'STUDENT') {
        const [summaries, logs] = await Promise.all([
          getStudentAttendanceSummaryApi(),
          getStudentAttendanceLogsApi(),
        ]);
        setStudentAttendance(summaries);
        setAttendanceLogs(logs);
        setStudents([]);
        setSessions([]);
      } else {
        const [rosters, loadedSessions] = await Promise.all([
          role === 'ADMIN'
            ? listStudentsApi().then((allStudents) => [allStudents])
            : Promise.all(loadedCourses.map((course) => getCourseStudentsApi(course.id))),
          getAttendanceSessionsApi(),
        ]);
        const uniqueStudents = new Map();
        rosters.flat().forEach((student) => uniqueStudents.set(student.id, student));
        setStudents([...uniqueStudents.values()]);
        setSessions(loadedSessions);
        setAttendanceLogs([]);
        setStudentAttendance([]);
      }
    } catch (error) {
      showToast(error.message || 'Could not load data from the server.', 'error');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, role, showToast]);

  useEffect(() => {
    if (!isAuthenticated) return;
    refreshData().catch(() => {});
  }, [isAuthenticated, user?.id, refreshData]);

  const addStudent = async (studentData) => {
    const created = await createStudentApi(studentData);
    await refreshData();
    return created;
  };

  const enrollStudent = async (courseId, studentId) => {
    const enrollment = await enrollStudentApi(courseId, studentId);
    await refreshData();
    return enrollment;
  };

  return (
    <DataContext.Provider
      value={{
        courses,
        students,
        sessions,
        attendanceLogs,
        studentAttendance,
        isLoading,
        refreshData,
        addStudent,
        enrollStudent,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
