'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Mail, KeyRound, RefreshCw } from 'lucide-react';
import { AuthService } from '@/services/auth.service';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState('robodevika@gmail.com');
  const [otp, setOtp] = React.useState('');
  const [otpSent, setOtpSent] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [countdown, setCountdown] = React.useState(0);

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendOtp = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (email.trim().toLowerCase() !== 'robodevika@gmail.com') {
      setError('Access denied. Only robodevika@gmail.com is authorized to log in.');
      setLoading(false);
      return;
    }

    try {
      const data = await AuthService.sendOtp(email.trim().toLowerCase());
      setOtpSent(true);
      setCountdown(60);
      setSuccess(data.otp_fallback ? `OTP generated: ${data.otp_fallback} (Dev Mode)` : 'OTP has been sent to your email.');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const data = await AuthService.verifyOtp(email.trim().toLowerCase(), otp.trim());
      if (data.onboarding_completed) {
        router.push('/dashboard');
      } else {
        router.push('/onboarding');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Invalid or expired OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Background radial effects */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Card container */}
      <div className="w-full max-w-md glass p-8 rounded-2xl border border-zinc-800 shadow-2xl relative z-10">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.png" alt="Study Commander Logo" className="h-16 w-16 rounded-2xl object-cover mb-4 shadow-lg shadow-indigo-600/20" />
          <h2 className="text-2xl font-black tracking-tight text-white mb-1">
            STUDY COMMANDER AI
          </h2>
          <p className="text-zinc-400 text-sm font-medium">
            Personal CA Foundation AI Mentor
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-4 mb-6 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm font-medium">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 mb-6 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm font-medium">
            {success}
          </div>
        )}

        {/* Input Form */}
        {!otpSent ? (
          <form onSubmit={handleSendOtp} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-zinc-400 text-xs font-semibold mb-2 uppercase tracking-wide">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="robodevika@gmail.com"
                  className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                />
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">
                Note: Access is restricted to authorized student email only.
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <span>{loading ? 'Sending OTP...' : 'Send OTP Code'}</span>
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            {/* Email (Readonly) */}
            <div>
              <label className="block text-zinc-400 text-xs font-semibold mb-2 uppercase tracking-wide">
                Email Address
              </label>
              <div className="relative opacity-60">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 text-sm cursor-not-allowed"
                />
              </div>
            </div>

            {/* OTP Code */}
            <div>
              <label className="block text-zinc-400 text-xs font-semibold mb-2 uppercase tracking-wide">
                6-Digit OTP Code
              </label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit code"
                  className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm tracking-[0.2em] font-mono text-center"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <span>{loading ? 'Verifying...' : 'Verify & Sign In'}</span>
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>

            {/* Resend button */}
            <div className="text-center pt-2">
              {countdown > 0 ? (
                <span className="text-xs text-zinc-500">
                  Resend OTP in {countdown}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-bold transition-all cursor-pointer flex items-center gap-1.5 mx-auto"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Resend OTP Code</span>
                </button>
              )}
            </div>
          </form>
        )}

      </div>
    </main>
  );
}
