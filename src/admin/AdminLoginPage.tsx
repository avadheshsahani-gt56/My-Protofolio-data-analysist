import { useState, type FormEvent } from 'react';
import { ArrowLeft, Eye, EyeOff, Lock, ShieldCheck, AlertTriangle } from 'lucide-react';
import { AUTHORIZED_ADMIN_EMAIL } from '../data/initialPortfolio';
import { isSupabaseConfigured } from '../lib/supabase';

interface AdminLoginPageProps {
  onSignIn: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
  onBackToPortfolio: () => void;
}

export function AdminLoginPage({
  onSignIn,
  onBackToPortfolio,
}: AdminLoginPageProps) {
  const [email, setEmail] = useState(AUTHORIZED_ADMIN_EMAIL);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Please enter your admin email address.');
      return;
    }

    if (trimmedEmail !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
      setError(
        `Access is restricted to the authorized admin email (${AUTHORIZED_ADMIN_EMAIL}).`
      );
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    const result = await onSignIn(trimmedEmail, password);
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error ?? 'Invalid email or password.');
    }
  };

  return (
    <div className="min-h-screen bg-[#080D1A] text-slate-100 flex flex-col justify-center px-4 py-12">
      <div className="w-full max-w-md mx-auto space-y-6">
        <button
          type="button"
          onClick={onBackToPortfolio}
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-[#00D9FF] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Public Portfolio</span>
        </button>

        <div className="rounded-2xl bg-[#101B30] border border-slate-800/80 p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="space-y-2">
            <div className="w-11 h-11 rounded-xl bg-[#080D1A] border border-slate-800 flex items-center justify-center text-[#00D9FF]">
              <Lock className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight pt-1">
              Portfolio Admin Login
            </h1>
            <p className="text-sm text-slate-400">
              Sign in with your Supabase Auth credentials to manage Avadhesh
              Sahani&apos;s Data Analyst portfolio.
            </p>
          </div>

          {!isSupabaseConfigured && (
            <div
              role="alert"
              className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5 text-xs text-amber-200 leading-relaxed"
            >
              <div className="flex items-center gap-2 font-semibold text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Supabase Publishable Key Missing</span>
              </div>
              <p>
                Set <span className="font-mono">VITE_SUPABASE_PUBLISHABLE_KEY</span> in
                your environment to enable live Supabase authentication.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label
                htmlFor="admin-email"
                className="block text-sm font-medium text-slate-200 mb-1.5"
              >
                Admin Email
              </label>
              <input
                id="admin-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={AUTHORIZED_ADMIN_EMAIL}
                className="w-full px-3.5 py-2.5 text-sm text-white bg-[#080D1A] border border-slate-700 rounded-lg focus:outline-none focus:border-[#00D9FF] transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-sm font-medium text-slate-200 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Enter your password"
                  className="w-full px-3.5 py-2.5 pr-10 text-sm text-white bg-[#080D1A] border border-slate-700 rounded-lg focus:outline-none focus:border-[#00D9FF] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !isSupabaseConfigured}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#078BFF] hover:bg-[#078BFF]/90 disabled:opacity-60 rounded-lg transition-colors"
            >
              <span>{isSubmitting ? 'Signing In...' : 'Sign In to Admin Panel'}</span>
            </button>
          </form>

          <div className="pt-3 border-t border-slate-800 flex items-start gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-[#00D9FF] shrink-0 mt-0.5" />
            <span>
              Protected by Supabase Authentication &amp; Row Level Security for{' '}
              <span className="font-mono text-slate-300">{AUTHORIZED_ADMIN_EMAIL}</span>.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
