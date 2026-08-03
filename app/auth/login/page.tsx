'use client';

import { useLogin } from '@/hooks/useLogin';
import Image from 'next/image';
import { useState } from 'react';
import { toast } from 'sonner';

export default function Login() {
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error, clearError } = useLogin();

  async function handleSubmit() {
    try {
      if (!loginValue.trim() || !password.trim()) return;
      await login({ login: loginValue, password });
    } catch (error) {
      console.error('Login xatoligi:', error);
      toast.error(
        error instanceof Error ? error.message : 'Kutilmagan xatolik yuz berdi',
      );
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSubmit();
  }

  return (
    <div className="relative flex min-h-dvh w-full min-w-0 items-center justify-center overflow-hidden p-4 sm:p-8">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        .font-syne { font-family: 'Syne', sans-serif; }
        .font-dm   { font-family: 'DM Sans', sans-serif; }

        .field-input {
          width: 100%;
          border-radius: 12px;
          padding: 12px 14px 12px 42px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
          background: rgb(255 255 255 / 0.6);
          border: 1px solid rgb(0 0 0 / 0.1);
          color: #1e1e2e;
        }
        .field-input::placeholder { color: rgb(0 0 0 / 0.3); }
        .field-input:focus {
          border-color: rgb(99 77 220 / 0.6);
          background: rgb(255 255 255 / 0.85);
          box-shadow: 0 0 0 3px rgb(99 77 220 / 0.15);
        }
        .field-input.error {
          border-color: rgb(239 68 68 / 0.6);
          box-shadow: 0 0 0 3px rgb(239 68 68 / 0.1);
        }

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(32px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fieldIn {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%      { transform: translateX(-6px); }
          40%      { transform: translateX(6px); }
          60%      { transform: translateX(-4px); }
          80%      { transform: translateX(4px); }
        }

        .anim-card    { animation: cardIn  0.7s cubic-bezier(0.22,1,0.36,1) both; }
        .anim-field-1 { animation: fieldIn 0.5s 0.10s cubic-bezier(0.22,1,0.36,1) both; }
        .anim-field-2 { animation: fieldIn 0.5s 0.17s cubic-bezier(0.22,1,0.36,1) both; }
        .anim-field-3 { animation: fieldIn 0.5s 0.24s cubic-bezier(0.22,1,0.36,1) both; }
        .anim-field-4 { animation: fieldIn 0.5s 0.31s cubic-bezier(0.22,1,0.36,1) both; }
        .anim-field-5 { animation: fieldIn 0.5s 0.38s cubic-bezier(0.22,1,0.36,1) both; }
        .anim-btn-1   { animation: fieldIn 0.5s 0.45s cubic-bezier(0.22,1,0.36,1) both; }
        .anim-btn-2   { animation: fieldIn 0.5s 0.52s cubic-bezier(0.22,1,0.36,1) both; }
        .anim-shake   { animation: shake 0.4s cubic-bezier(0.22,1,0.36,1); }

        .btn-login {
          width: 100%;
          padding: 13px;
          border: none;
          border-radius: 12px;
          color: #fff;
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 15px;
          letter-spacing: 0.3px;
          cursor: pointer;
          background: linear-gradient(135deg, #634DCC 0%, #4a3aad 100%);
          box-shadow: 0 4px 24px rgb(99 77 220 / 0.35);
          transition: transform 0.15s, box-shadow 0.2s, opacity 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .btn-login:hover:not(:disabled)  { transform: translateY(-1px); box-shadow: 0 6px 28px rgb(99 77 220 / 0.5); }
        .btn-login:active:not(:disabled) { transform: scale(0.98); }
        .btn-login:disabled { opacity: 0.65; cursor: not-allowed; }

        .btn-register {
          width: 100%;
          padding: 12px;
          background: transparent;
          border: 1px solid rgb(99 77 220 / 0.3);
          border-radius: 12px;
          color: rgb(99 77 220);
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          cursor: pointer;
          transition: border-color 0.2s, color 0.2s, background 0.2s;
        }
        .btn-register:hover {
          border-color: rgb(99 77 220 / 0.6);
          background: rgb(99 77 220 / 0.06);
        }

        .error-box {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 10px;
          background: rgb(239 68 68 / 0.08);
          border: 1px solid rgb(239 68 68 / 0.2);
          color: #dc2626;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          margin-bottom: 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }
      `}</style>

      {/* Background */}
      <div className="absolute inset-0 -z-20">
        <Image
          src="/image/bagr2.jpg"
          alt="background"
          fill
          className="object-cover object-center"
          priority
        />
      </div>
      <div className="absolute inset-0 -z-10 backdrop-blur-sm bg-white/30" />

      {/* Card */}
      <div className="anim-card relative z-10 w-full max-w-md rounded-3xl border border-white/60 bg-white/75 p-6 shadow-2xl backdrop-blur-xl sm:p-10">
        <div className="absolute -inset-px -z-10 rounded-3xl bg-linear-to-br from-violet-200/40 via-white/10 to-emerald-100/30 opacity-60" />

        {/* Logo */}
        <div className="flex items-center justify-center mb-6">
          <Image
            src="/garmonik-logo-user.png"
            alt="Klinika"
            width={120}
            height={120}
            priority
            className="h-auto w-auto"
            style={{ width: 'auto', height: 'auto' }}
          />
        </div>

        {/* Heading */}
        <h1 className="font-syne font-bold text-3xl text-slate-800 leading-tight mb-1">
          Tizimga kirish
        </h1>
        <p className="font-dm text-sm text-slate-500 font-light mb-8">
          Shaxsiy kabinetingizga kiring
        </p>

        {/* Error xabari */}
        {error && (
          <div className="error-box anim-shake">
            <svg
              width="15"
              height="15"
              viewBox="0 0 15 15"
              fill="none"
              style={{ flexShrink: 0 }}>
              <circle
                cx="7.5"
                cy="7.5"
                r="6.5"
                stroke="#dc2626"
                strokeWidth="1.3"
              />
              <path
                d="M7.5 4.5v3.5"
                stroke="#dc2626"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
              <circle cx="7.5" cy="10.5" r="0.7" fill="#dc2626" />
            </svg>
            <span>{error.message}</span>
            <button
              onClick={clearError}
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#dc2626',
                padding: '0 2px',
                lineHeight: 1,
              }}>
              ✕
            </button>
          </div>
        )}

        {/* Fields */}
        <div className="flex flex-col gap-3.5 mb-6">
          {/* Login */}
          <div className="anim-field-4">
            <p className="font-dm text-[11px] font-medium uppercase tracking-widest text-slate-400 mb-1.5">
              Login
            </p>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 pointer-events-none text-slate-400">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect
                    x="1"
                    y="3"
                    width="14"
                    height="10"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.3"
                  />
                  <path
                    d="M1.5 4L8 9L14.5 4"
                    stroke="currentColor"
                    strokeWidth="1.3"
                  />
                </svg>
              </span>
              <input
                className={`field-input${error ? ' error' : ''}`}
                type="text"
                placeholder="login..."
                value={loginValue}
                onChange={(e) => {
                  setLoginValue(e.target.value);
                  clearError();
                }}
                onKeyDown={handleKeyDown}
                disabled={loading}
                autoComplete="username"
              />
            </div>
          </div>

          {/* Parol */}
          <div className="anim-field-5">
            <p className="font-dm text-[11px] font-medium uppercase tracking-widest text-slate-400 mb-1.5">
              Parol
            </p>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 pointer-events-none text-slate-400">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect
                    x="3"
                    y="7"
                    width="10"
                    height="7"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.3"
                  />
                  <path
                    d="M5 7V5a3 3 0 0 1 6 0v2"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                  <circle cx="8" cy="10.5" r="1" fill="currentColor" />
                </svg>
              </span>
              <input
                className={`field-input${error ? ' error' : ''}`}
                type="password"
                placeholder="••••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearError();
                }}
                onKeyDown={handleKeyDown}
                disabled={loading}
                autoComplete="current-password"
              />
            </div>
          </div>
        </div>

        {/* Login tugmasi */}
        <div className="anim-btn-1 mb-3">
          <button
            className="btn-login"
            onClick={handleSubmit}
            // disabled={loading || !loginValue.trim() || !password.trim()}
          >
            {loading ?
              <>
                <span className="spinner" />
                Kirilmoqda...
              </>
            : 'Tizimga kirish'}
          </button>
        </div>

        {/* Badges */}
        <div className="flex items-center justify-center gap-3 mt-6">
          {['256-bit SSL', 'Xavfsiz ulanish'].map((label, i) => (
            <div key={label} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-[11px] text-slate-300">•</span>}
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <div className="size-1.5 rounded-full bg-emerald-500/70" />
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
