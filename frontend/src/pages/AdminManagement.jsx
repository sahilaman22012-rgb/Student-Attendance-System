import React, { useEffect, useState } from 'react';
import { BookOpen, UserPlus } from 'lucide-react';
import { MainLayout } from '../components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { createCourseApi } from '../api/courses';
import { createTeacherApi, listUsersApi } from '../api/users';

const initialTeacher = {
  email: '',
  password: '',
  first_name: '',
  last_name: '',
  employee_id: '',
  department: '',
  office_location: '',
};

export function AdminManagement() {
  const { refreshData } = useData();
  const { showToast } = useToast();
  const [teachers, setTeachers] = useState([]);
  const [teacher, setTeacher] = useState(initialTeacher);
  const [course, setCourse] = useState({
    course_code: '',
    title: '',
    description: '',
    instructor_id: '',
    semester: '',
  });
  const [error, setError] = useState('');
  const [isSavingTeacher, setIsSavingTeacher] = useState(false);
  const [isSavingCourse, setIsSavingCourse] = useState(false);

  const loadTeachers = async () => {
    try {
      const list = await listUsersApi({ role: 'TEACHER' });
      setTeachers(list);
      setCourse((current) => ({
        ...current,
        instructor_id: current.instructor_id || list[0]?.id || '',
      }));
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  const submitTeacher = async (event) => {
    event.preventDefault();
    setError('');
    setIsSavingTeacher(true);
    try {
      await createTeacherApi(teacher);
      setTeacher(initialTeacher);
      await loadTeachers();
      showToast('Teacher account created.', 'success');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSavingTeacher(false);
    }
  };

  const submitCourse = async (event) => {
    event.preventDefault();
    setError('');
    setIsSavingCourse(true);
    try {
      await createCourseApi(course);
      setCourse((current) => ({
        course_code: '',
        title: '',
        description: '',
        instructor_id: current.instructor_id,
        semester: '',
      }));
      await refreshData();
      showToast('Course created.', 'success');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSavingCourse(false);
    }
  };

  return (
    <MainLayout title="Administration">
      <div>
        <h2 className="text-xl font-bold text-[#182443]">Institution setup</h2>
        <p className="text-sm text-slate-500">Create real instructor accounts and assign courses.</p>
      </div>
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" />Create instructor</CardTitle>
            <CardDescription>Instructor credentials are used to sign in to the application.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={submitTeacher}>
              <div className="grid grid-cols-2 gap-3">
                <Input label="First name" required value={teacher.first_name} onChange={(event) => setTeacher({ ...teacher, first_name: event.target.value })} />
                <Input label="Last name" required value={teacher.last_name} onChange={(event) => setTeacher({ ...teacher, last_name: event.target.value })} />
              </div>
              <Input label="Institution email" type="email" required value={teacher.email} onChange={(event) => setTeacher({ ...teacher, email: event.target.value })} />
              <Input label="Initial password" type="password" minLength={8} required value={teacher.password} onChange={(event) => setTeacher({ ...teacher, password: event.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Employee ID" required value={teacher.employee_id} onChange={(event) => setTeacher({ ...teacher, employee_id: event.target.value })} />
                <Input label="Department" required value={teacher.department} onChange={(event) => setTeacher({ ...teacher, department: event.target.value })} />
              </div>
              <Input label="Office location (optional)" value={teacher.office_location} onChange={(event) => setTeacher({ ...teacher, office_location: event.target.value })} />
              <Button type="submit" icon={UserPlus} isLoading={isSavingTeacher}>Create instructor</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5" />Create course</CardTitle>
            <CardDescription>Assign a course to an active instructor account.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={submitCourse}>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Course code" required value={course.course_code} onChange={(event) => setCourse({ ...course, course_code: event.target.value })} />
                <Input label="Semester" required value={course.semester} onChange={(event) => setCourse({ ...course, semester: event.target.value })} />
              </div>
              <Input label="Course title" required value={course.title} onChange={(event) => setCourse({ ...course, title: event.target.value })} />
              <Input label="Description (optional)" value={course.description} onChange={(event) => setCourse({ ...course, description: event.target.value })} />
              <Select
                label="Instructor"
                required
                value={course.instructor_id}
                onChange={(event) => setCourse({ ...course, instructor_id: event.target.value })}
                options={teachers.map((item) => ({
                  value: item.id,
                  label: `${item.first_name} ${item.last_name} (${item.email})`,
                }))}
              />
              <Button type="submit" icon={BookOpen} isLoading={isSavingCourse} disabled={!teachers.length}>Create course</Button>
              {!teachers.length && <p className="text-xs text-amber-700">Create an instructor first.</p>}
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
