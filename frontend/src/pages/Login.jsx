import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const result = await login(email, password);
      const returnTo = location.state?.from?.pathname;
      navigate(returnTo || (result.user.role === 'STUDENT' ? '/my-attendance' : '/dashboard'), {
        replace: true,
      });
    } catch (loginError) {
      setError(loginError.message || 'Sign in failed. Check your email and password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4efe5] flex items-center justify-center p-4 lg:p-8">
      <div className="w-full max-w-5xl bg-[#fbf8f1] rounded-3xl shadow-2xl border border-slate-200 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
        <div className="lg:col-span-5 bg-[#f4efe5] text-[#191714] p-8 lg:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200">
          <div className="flex justify-center">
            <img
              src="/brand/secure-attendance-logo.png"
              alt="Secure Attendance — Scan, Verify, Attend"
              className="w-full max-w-[240px] rounded-2xl bg-white object-contain shadow-sm"
            />
          </div>
          <div className="my-8">
            <h2 className="text-3xl font-black leading-tight">Attendance you can trust.</h2>
            <p className="text-sm text-slate-600 mt-3 leading-relaxed">
              Sign in with your institution account to manage or review verified class attendance.
            </p>
          </div>
          <div className="pt-4 border-t border-slate-200 text-xs text-slate-600 flex items-center">
            <ShieldCheck className="w-4 h-4 text-[#b94d24] mr-2" />
            Authenticated account access
          </div>
        </div>

        <div className="lg:col-span-7 p-8 lg:p-12 flex items-center">
          <div className="w-full max-w-md mx-auto">
            <h3 className="text-2xl font-bold text-[#191714]">Sign in</h3>
            <p className="text-sm text-slate-500 mt-1 mb-7">Use the email and password assigned by your administrator.</p>
            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div role="alert" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
                  {error}
                </div>
              )}
              <Input
                label="Institution email"
                type="email"
                icon={Mail}
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <Input
                label="Password"
                type="password"
                icon={Lock}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <Button type="submit" className="w-full py-3" isLoading={isLoading} icon={ArrowRight}>
                Sign in
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
