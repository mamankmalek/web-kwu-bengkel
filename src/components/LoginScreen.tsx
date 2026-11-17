import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import type { ThemeMode } from '../types/lbmm';
import { LBMM_LOGO_URL, ThemeSwitch } from './LiquidPrimitives';

export function LoginScreen({
  theme,
  onToggleTheme,
  onLogin,
  initialError = '',
}: {
  theme: ThemeMode;
  onToggleTheme: () => void;
  onLogin: (password: string) => Promise<void>;
  initialError?: string;
}) {
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Masukkan kata sandi terlebih dahulu.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onLogin(password);
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      id="login-screen"
      className="login-bg min-h-[100dvh] flex flex-col justify-between p-5 md:p-8"
    >
      <header className="flex items-center justify-between max-w-6xl w-full mx-auto">
        <img
          src={LBMM_LOGO_URL}
          alt="Logo LBMM"
          width={130}
          height={42}
          referrerPolicy="no-referrer"
          className="brand-logo w-[124px] h-[40px]"
        />
        <div className="glass-chrome rounded-full px-2 py-0.5">
          <ThemeSwitch theme={theme} onToggle={onToggleTheme} />
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center py-8">
        <form
          id="login-form"
          onSubmit={handleSubmit}
          className="ios-enter glass-chrome w-full max-w-[390px] rounded-[28px] p-7 md:p-8"
        >
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[var(--accent-soft)] text-[var(--primary)] border border-[var(--accent-border)] mb-5">
            <Lock className="w-5 h-5" strokeWidth={2} />
          </div>

          <p className="text-[0.7rem] font-bold tracking-[0.14em] uppercase text-[var(--muted)] mb-1.5">
            SERVICE 2026/2027
          </p>
          <h1 className="text-[1.75rem] font-extrabold tracking-tight mb-5">Masuk</h1>

          <div className="mb-4">
            <label
              htmlFor="login-password"
              className="block text-[0.82rem] font-semibold mb-1.5"
            >
              Kata sandi
            </label>
            <div className="flex items-center rounded-[13px] border border-[var(--glass-border-subtle)] bg-[var(--surface-recessed)] focus-within:border-[var(--primary)] focus-within:bg-[var(--surface-elevated)] focus-within:shadow-[0_0_0_3.5px_var(--accent-soft)] transition-all">
              <input
                id="login-password"
                type={showPass ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-describedby="login-error"
                placeholder="Masukkan kata sandi bengkel"
                className="w-full min-h-[46px] px-3.5 bg-transparent border-0 text-[var(--text)] focus:outline-none text-[16px] md:text-[0.94rem]"
              />
              <button
                type="button"
                id="password-visibility"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                aria-pressed={showPass}
                className="w-11 h-11 flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] shrink-0"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {(error || initialError) && (
            <p
              id="login-error"
              role="alert"
              className="text-[0.82rem] font-medium text-[var(--danger)] mb-4"
            >
              {error || initialError}
            </p>
          )}

          <button
            id="login-submit"
            type="submit"
            disabled={busy}
            className="ios-btn ios-btn-primary w-full min-h-[46px] text-[0.94rem]"
          >
            {busy ? 'Memeriksa...' : 'Masuk'}
          </button>

          <p className="text-center text-[0.76rem] text-[var(--muted)] mt-6 mb-0">
            LBMM · FT-IRS ITS
          </p>
        </form>
      </div>

      <div className="h-6" aria-hidden="true" />
    </section>
  );
}
