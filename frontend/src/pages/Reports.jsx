import React, { useEffect, useState } from 'react';
import { AlertTriangle, Download, Users } from 'lucide-react';
import { MainLayout } from '../components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { getCourseRosterAnalyticsApi, getCourseSummaryApi } from '../api/attendance';
import { apiDownload } from '../api/client';

export function Reports() {
  const { courses } = useData();
  const { showToast } = useToast();
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [roster, setRoster] = useState([]);
  const [summary, setSummary] = useState(null);
  const [onlyLowAttendance, setOnlyLowAttendance] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!selectedCourseId && courses.length) setSelectedCourseId(courses[0].id);
  }, [courses, selectedCourseId]);

  useEffect(() => {
    let active = true;
    if (!selectedCourseId) return undefined;
    setIsLoading(true);
    setError('');
    Promise.all([
      getCourseRosterAnalyticsApi(selectedCourseId),
      getCourseSummaryApi(selectedCourseId),
    ])
      .then(([courseRoster, courseSummary]) => {
        if (!active) return;
        setRoster(courseRoster);
        setSummary(courseSummary);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError.message);
        setRoster([]);
        setSummary(null);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedCourseId]);

  const lowAttendanceCount = roster.filter((student) => student.is_low_attendance).length;
  const averageRate = roster.length
    ? (roster.reduce((total, student) => total + student.attendance_rate, 0) / roster.length).toFixed(1)
    : '0.0';
  const visibleRows = roster.filter((student) => !onlyLowAttendance || student.is_low_attendance);
  const selectedCourse = courses.find((course) => course.id === selectedCourseId);

  const exportReport = async (format) => {
    if (!selectedCourse) return;
    try {
      await apiDownload(
        `/reports/course/${selectedCourseId}/export?format=${format}`,
        `${selectedCourse.course_code}-attendance.${format}`,
      );
      showToast(`${format.toUpperCase()} report downloaded.`, 'success');
    } catch (downloadError) {
      showToast(downloadError.message || 'Could not download report.', 'error');
    }
  };

  return (
    <MainLayout title="Attendance Analytics">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#182443]">Course attendance reports</h2>
          <p className="text-sm text-slate-500">Attendance totals are calculated from completed sessions stored by the server.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={Download} onClick={() => exportReport('csv')} disabled={!selectedCourse}>
            Export CSV
          </Button>
          <Button variant="primary" icon={Download} onClick={() => exportReport('pdf')} disabled={!selectedCourse}>
            Export PDF
          </Button>
        </div>
      </div>
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <Card>
        <CardContent className="p-4">
          <Select
            label="Course"
            value={selectedCourseId}
            onChange={(event) => setSelectedCourseId(event.target.value)}
            options={courses.map((course) => ({
              value: course.id,
              label: `${course.course_code} - ${course.title}`,
            }))}
          />
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card><CardContent><p className="text-xs uppercase text-slate-500">Completed sessions</p><p className="mt-1 text-2xl font-bold">{summary?.total_completed_sessions ?? '—'}</p></CardContent></Card>
        <Card><CardContent><p className="text-xs uppercase text-slate-500">Average roster attendance</p><p className="mt-1 text-2xl font-bold">{averageRate}%</p></CardContent></Card>
        <Card><CardContent><p className="text-xs uppercase text-slate-500">Below 75%</p><p className="mt-1 flex items-center gap-2 text-2xl font-bold text-rose-700"><AlertTriangle className="h-5 w-5" />{lowAttendanceCount}</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Enrolled student attendance</CardTitle>
            <CardDescription>{summary?.total_active_enrollments ?? 0} active enrollments</CardDescription>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={onlyLowAttendance} onChange={(event) => setOnlyLowAttendance(event.target.checked)} />
            Shortage only
          </label>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-slate-500">Loading report…</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Roll number</TableHead><TableHead>Student</TableHead><TableHead>Attended / Sessions</TableHead><TableHead>Rate</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {visibleRows.map((student) => (
                  <TableRow key={student.student_id}>
                    <TableCell className="font-mono">{student.roll_number}</TableCell>
                    <TableCell>{student.student_name}</TableCell>
                    <TableCell>{student.sessions_attended} / {student.total_completed_sessions}</TableCell>
                    <TableCell>{student.attendance_rate}%</TableCell>
                    <TableCell><Badge status={student.is_low_attendance ? 'WARNING' : 'GOOD'}>{student.is_low_attendance ? 'Shortage' : 'Eligible'}</Badge></TableCell>
                  </TableRow>
                ))}
                {!visibleRows.length && (
                  <TableRow><TableCell colSpan={5} className="py-8 text-center text-slate-500"><Users className="mx-auto mb-2 h-5 w-5" />{roster.length ? 'No shortage records for this course.' : 'No enrolled students or attendance history yet.'}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}
