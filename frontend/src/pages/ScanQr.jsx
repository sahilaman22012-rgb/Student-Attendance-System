import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Link } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { scanQrTokenApi } from '../api/attendance';

export function ScanQr() {
  const scannerRef = useRef(null);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner('student-qr-reader', {
      fps: 10,
      qrbox: { width: 240, height: 240 },
      rememberLastUsedCamera: true,
    }, false);
    scannerRef.current = scanner;
    scanner.render(
      async (decodedText) => {
        if (!scannerRef.current) return;
        await scannerRef.current.clear();
        scannerRef.current = null;
        try {
          const payload = JSON.parse(decodedText);
          if (!payload.session_id || !payload.nonce) {
            throw new Error('This QR code is not an attendance check-in code.');
          }
          let deviceId = localStorage.getItem('attendance_device_id');
          if (!deviceId) {
            deviceId = crypto.randomUUID();
            localStorage.setItem('attendance_device_id', deviceId);
          }
          await scanQrTokenApi(payload.session_id, payload.nonce, deviceId);
          setMessage('Attendance recorded successfully.');
          setIsError(false);
        } catch (scanError) {
          setMessage(scanError.message || 'Could not verify this QR code.');
          setIsError(true);
        }
      },
      () => {},
    );

    return () => {
      const currentScanner = scannerRef.current;
      scannerRef.current = null;
      if (currentScanner) currentScanner.clear().catch(() => {});
    };
  }, []);

  return (
    <MainLayout title="Scan attendance QR">
      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle>Scan class attendance QR</CardTitle>
          <CardDescription>Allow camera access and scan the code shown by your instructor.</CardDescription>
        </CardHeader>
        <CardContent>
          <div id="student-qr-reader" />
          {message && (
            <p role="status" className={`mt-4 rounded-lg p-3 text-sm ${isError ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {message}
            </p>
          )}
          <Link to="/my-attendance" className="mt-4 inline-block text-sm font-semibold text-indigo-700">
            View my attendance
          </Link>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
