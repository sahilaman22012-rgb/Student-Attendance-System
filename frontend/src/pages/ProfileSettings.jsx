import React, { useState } from 'react';
import { Lock, Key, CheckCircle2, LogOut } from 'lucide-react';
import { MainLayout } from '../components/layout/MainLayout';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import { changePasswordApi } from '../api/auth';

export function ProfileSettings() {
  const { user, role, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      showToast('New password must be at least 8 characters long.', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await changePasswordApi(currentPassword, newPassword);
      showToast('Password updated successfully!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      showToast(error.message || 'Could not update password.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    showToast('Signed out of ATTENDIQ Platform', 'info');
    navigate('/login');
  };

  return (
    <MainLayout title="Account & Preferences">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#182443] tracking-tight">Account & Security</h2>
          <p className="text-xs text-slate-500">Manage your account access and password</p>
        </div>

        <Button variant="danger" icon={LogOut} onClick={handleLogout}>
          Sign Out of Account
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
            <CardDescription>Verified academic credentials</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center text-center space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-[#182443] text-white font-black text-2xl flex items-center justify-center shadow-lg ring-4 ring-[#7067E8]/30">
              {user?.first_name ? user.first_name[0] : 'U'}
            </div>

            <div>
              <h3 className="text-lg font-bold text-[#182443]">
                {user?.first_name} {user?.last_name}
              </h3>
              <p className="text-xs text-slate-500">{user?.email}</p>
              <div className="mt-2">
                <Badge status={user?.status || 'ACTIVE'}>Role: {role}</Badge>
              </div>
            </div>

            <div className="w-full pt-4 border-t border-slate-100 space-y-3 text-xs text-left">
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase">Account ID:</span>
                <span className="font-mono text-[#182443] font-bold">{user?.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase">Department:</span>
                <span className="text-slate-900 font-bold">{user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase">Platform Status:</span>
                <span className="text-[#2fa085] font-bold flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Verified Active
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security & Preferences */}
        <div className="lg:col-span-2 space-y-6">
          {/* Password Change Form */}
          <Card>
            <CardHeader>
              <CardTitle>Security & Password Change</CardTitle>
              <CardDescription>Update your ATTENDIQ login credentials</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                <Input
                  label="Current Password"
                  type="password"
                  icon={Lock}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />

                <Input
                  label="New Password"
                  type="password"
                  icon={Key}
                  required
                  helperText="Minimum 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />

                <Input
                  label="Confirm New Password"
                  type="password"
                  icon={Key}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />

                <div className="pt-2">
                  <Button type="submit" variant="primary" isLoading={isSubmitting}>
                    Update Password
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

        </div>
      </div>
    </MainLayout>
  );
}
