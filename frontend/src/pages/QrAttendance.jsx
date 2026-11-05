import React, { useEffect, useState } from 'react';
import { Play, QrCode, Square } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { MainLayout } from '../components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import {
  createAttendanceSessionApi,
  endAttendanceSessionApi,
  getCurrentQrTokenApi,
} from '../api/attendance';

export function QrAttendance() {
  const { courses, refreshData } = useData();
  const { showToast } = useToast();
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('5');
  const [activeSession, setActiveSession] = useState(null);
  const [qrToken, setQrToken] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!selectedCourseId && courses.length) setSelectedCourseId(courses[0].id);
  }, [courses, selectedCourseId]);

  useEffect(() => {
    if (!activeSession) return undefined;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((new Date(activeSession.end_time).getTime() - Date.now()) / 1000));
      setSecondsLeft(remaining);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeSession]);

  useEffect(() => {
    if (!activeSession || !qrToken) return undefined;
    const delay = Math.max(0, new Date(qrToken.expires_at).getTime() - Date.now() + 100);
    const timer = window.setTimeout(async () => {
      try {
        setQrToken(await getCurrentQrTokenApi(activeSession.id));
      } catch (requestError) {
        setError(requestError.message);
      }
    }, delay);
    return () => window.clearTimeout(timer);
  }, [activeSession, qrToken]);

  const startSession = async () => {
    setError('');
    setIsBusy(true);
    try {
      const session = await createAttendanceSessionApi({
        course_id: selectedCourseId,
        duration_minutes: Number(durationMinutes),
      });
      setActiveSession(session);
      setSecondsLeft(Number(durationMinutes) * 60);
      setQrToken(await getCurrentQrTokenApi(session.id));
      await refreshData();
      showToast('QR attendance session started.', 'success');
    } catch (requestError) {
      setError(requestError.message);
      setQrToken(null);
    } finally {
      setIsBusy(false);
    }
  };

  const endSession = async () => {
    if (!activeSession) return;
    setIsBusy(true);
    try {
      await endAttendanceSessionApi(activeSession.id);
      setActiveSession(null);
      setQrToken(null);
      await refreshData();
      showToast('Attendance session ended.', 'success');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsBusy(false);
    }
  };

  const qrPayload = qrToken
    ? JSON.stringify({ session_id: qrToken.session_id, nonce: qrToken.nonce })
    : '';

  return (
    <MainLayout title="QR Attendance Session">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#182443]">Live QR attendance</h2>
          <p className="text-sm text-slate-500">Tokens are issued and rotated by the server every 15 seconds.</p>
        </div>
        {activeSession && (
          <Button variant="danger" icon={Square} onClick={endSession} disabled={isBusy}>
            End session
          </Button>
        )}
      </div>
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Session setup</CardTitle>
            <CardDescription>Select a course and check-in window.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              label="Course"
              value={selectedCourseId}
              disabled={Boolean(activeSession)}
              onChange={(event) => setSelectedCourseId(event.target.value)}
              options={courses.map((course) => ({
                value: course.id,
                label: `${course.course_code} - ${course.title}`,
              }))}
            />
            <Select
              label="Duration"
              value={durationMinutes}
              disabled={Boolean(activeSession)}
              onChange={(event) => setDurationMinutes(event.target.value)}
              options={[1, 3, 5, 10].map((minutes) => ({
                value: String(minutes),
                label: `${minutes} minutes`,
              }))}
            />
            {!activeSession && (
              <Button
                className="w-full"
                icon={Play}
                disabled={!selectedCourseId || isBusy}
                isLoading={isBusy}
                onClick={startSession}
              >
                Start session
              </Button>
            )}
            {activeSession && (
              <p className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
                Active · {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')} remaining
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Student check-in QR</CardTitle>
            <CardDescription>Students sign in and scan this code from the Scan QR page.</CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-80 flex-col items-center justify-center gap-4">
            {qrPayload && secondsLeft > 0 ? (
              <>
                <QRCodeSVG value={qrPayload} size={260} level="M" />
                <p className="text-xs text-slate-500">Token expires at {new Date(qrToken.expires_at).toLocaleTimeString()}</p>
              </>
            ) : (
              <div className="text-center text-slate-400">
                <QrCode className="mx-auto mb-2 h-12 w-12" />
                <p>Start a session to show its secure QR code.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
