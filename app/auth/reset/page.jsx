'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

export default function ForgotPassword() {
  const [step, setStep] = useState('login');
  const [login, setLogin] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const updated = [...otp];
    updated[index] = value.slice(-1);
    setOtp(updated);
    if (value && index < 5) {
      const next = document.getElementById(`otp-${index + 1}`);
      next?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prev = document.getElementById(`otp-${index - 1}`);
      prev?.focus();
    }
  };

  async function requestResetCode() {
    setSending(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: login.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'So‘rov yuborilmadi');
        return;
      }
      if (data.devCode) {
        toast.message('Ishlab chiqish rejimi', {
          description: `Tasdiqlash kodi: ${data.devCode}`,
        });
      } else {
        toast.info(data.message || 'Keyingi qadamga o‘ting');
      }
      setOtp(['', '', '', '', '', '']);
      setStep('otp');
    } catch {
      toast.error('Tarmoq xatoligi');
    } finally {
      setSending(false);
    }
  }

  async function submitNewPassword() {
    if (newPassword.length < 6 || newPassword !== confirmPassword) return;
    const code = otp.join('');
    if (code.length !== 6) {
      toast.error('6 xonali kodni to‘liq kiriting');
      return;
    }
    setResetting(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: login.trim(),
          code,
          newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'Parol yangilanmadi');
        return;
      }
      toast.success(data.message || 'Parol yangilandi');
      setStep('success');
    } catch {
      toast.error('Tarmoq xatoligi');
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center p-8">
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
        .field-input-icon-right {
          padding: 12px 42px 12px 42px;
        }
        .field-input::placeholder { color: rgb(0 0 0 / 0.3); }
        .field-input:focus {
          border-color: rgb(99 77 220 / 0.6);
          background: rgb(255 255 255 / 0.85);
          box-shadow: 0 0 0 3px rgb(99 77 220 / 0.15);
        }

        .otp-input {
          width: 48px;
          height: 54px;
          border-radius: 12px;
          text-align: center;
          font-family: 'Syne', sans-serif;
          font-size: 20px;
          font-weight: 700;
          outline: none;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
          background: rgb(255 255 255 / 0.6);
          border: 1px solid rgb(0 0 0 / 0.1);
          color: #1e1e2e;
          caret-color: #634DCC;
        }
        .otp-input:focus {
          border-color: rgb(99 77 220 / 0.6);
          background: rgb(255 255 255 / 0.85);
          box-shadow: 0 0 0 3px rgb(99 77 220 / 0.15);
        }
        .otp-input.filled {
          border-color: rgb(99 77 220 / 0.4);
          background: rgb(99 77 220 / 0.06);
        }

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(32px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fieldIn {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes successPop {
          0%   { transform: scale(0.5); opacity: 0; }
          70%  { transform: scale(1.1); }
          100% { transform: scale(1);   opacity: 1; }
        }

        .anim-card    { animation: cardIn  0.7s cubic-bezier(0.22,1,0.36,1) both; }
        .anim-step    { animation: fadeUp  0.4s cubic-bezier(0.22,1,0.36,1) both; }
        .anim-field-1 { animation: fieldIn 0.5s 0.10s cubic-bezier(0.22,1,0.36,1) both; }
        .anim-field-2 { animation: fieldIn 0.5s 0.17s cubic-bezier(0.22,1,0.36,1) both; }
        .anim-btn-1   { animation: fieldIn 0.5s 0.24s cubic-bezier(0.22,1,0.36,1) both; }
        .anim-btn-2   { animation: fieldIn 0.5s 0.31s cubic-bezier(0.22,1,0.36,1) both; }
        .anim-success { animation: successPop 0.6s 0.1s cubic-bezier(0.22,1,0.36,1) both; }

        .btn-primary {
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
        }
        .btn-primary:hover  { transform: translateY(-1px); box-shadow: 0 6px 28px rgb(99 77 220 / 0.5); }
        .btn-primary:active { transform: scale(0.98); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .btn-secondary {
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
        .btn-secondary:hover {
          border-color: rgb(99 77 220 / 0.6);
          background: rgb(99 77 220 / 0.06);
        }

        .step-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 28px;
        }
        .step-dot {
          height: 4px;
          border-radius: 2px;
          transition: all 0.3s ease;
          background: rgb(0 0 0 / 0.1);
        }
        .step-dot.active  { background: #634DCC; width: 24px; }
        .step-dot.done    { background: rgb(99 77 220 / 0.4); width: 12px; }
        .step-dot.pending { width: 12px; }

        .eye-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: rgb(0 0 0 / 0.3);
          padding: 2px;
          transition: color 0.2s;
        }
        .eye-btn:hover { color: rgb(99 77 220 / 0.7); }

        .success-circle {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: rgb(16 185 129 / 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
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
      <div className="anim-card relative z-10 w-full max-w-md rounded-3xl p-10 border border-white/60 bg-white/75 backdrop-blur-xl shadow-2xl">
        <div className="absolute -inset-px -z-10 rounded-3xl bg-linear-to-br from-violet-200/40 via-white/10 to-emerald-100/30 opacity-60" />

        {/* Logo */}
        <div className="flex items-center justify-center mb-6">
          <Image
            src="/garmonik-logo-user.png"
            alt="Garmonik Plus Klinikasi"
            width={100}
            height={100}
          />
        </div>

        {/* ── STEP 1: Login kiriting ── */}
        {step === 'login' && (
          <div className="anim-step">
            <div className="step-indicator">
              <div className="step-dot active" />
              <div className="step-dot pending" />
              <div className="step-dot pending" />
            </div>

            <h1 className="font-syne font-bold text-3xl text-slate-800 leading-tight mb-1">
              Parolni unutdingizmi?
            </h1>
            <p className="font-dm text-sm text-slate-500 font-light mb-8">
              Loginingizni kiriting, tasdiqlash kodi yuboramiz
            </p>

            <div className="flex flex-col gap-3.5 mb-6">
              <div className="anim-field-1">
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
                    className="field-input"
                    type="text"
                    placeholder="login..."
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="anim-btn-1 mb-3">
              <button
                className="btn-primary"
                disabled={!login.trim() || sending}
                onClick={() => void requestResetCode()}>
                {sending ? 'Yuborilmoqda...' : 'Kodni yuborish'}
              </button>
            </div>

            <div className="flex items-center gap-2.5 my-5">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400">yoki</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <div className="anim-btn-2">
              <Link
                href="/auth/login"
                className="btn-secondary block text-center">
                Tizimga kirish
              </Link>
            </div>
          </div>
        )}

        {/* ── STEP 2: OTP ── */}
        {step === 'otp' && (
          <div className="anim-step">
            <div className="step-indicator">
              <div className="step-dot done" />
              <div className="step-dot active" />
              <div className="step-dot pending" />
            </div>

            <h1 className="font-syne font-bold text-3xl text-slate-800 leading-tight mb-1">
              Kodni kiriting
            </h1>
            <p className="font-dm text-sm text-slate-500 font-light mb-8">
              <span className="font-medium text-slate-700">{login}</span> uchun
              tasdiqlash kodi so‘raladi (SMS keyin ulashadi)
            </p>

            <div className="anim-field-1 flex justify-between gap-2 mb-8">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  className={`otp-input ${digit ? 'filled' : ''}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                />
              ))}
            </div>

            <div className="anim-btn-1 mb-3">
              <button
                className="btn-primary"
                disabled={otp.some((d) => !d)}
                onClick={() => setStep('newPassword')}>
                Tasdiqlash
              </button>
            </div>

            <div className="anim-btn-2 mt-4 text-center">
              <button
                className="font-dm text-sm text-slate-400 hover:text-violet-600 transition-colors"
                onClick={() => setStep('login')}>
                ← Orqaga qaytish
              </button>
            </div>

            <div className="mt-5 text-center">
              <span className="font-dm text-xs text-slate-400">
                Kod kelmadimi?{' '}
              </span>
              <button
                type="button"
                disabled={sending}
                className="font-dm text-xs text-violet-600 hover:underline disabled:opacity-50"
                onClick={() => void requestResetCode()}>
                Qayta yuborish
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Yangi parol ── */}
        {step === 'newPassword' && (
          <div className="anim-step">
            <div className="step-indicator">
              <div className="step-dot done" />
              <div className="step-dot done" />
              <div className="step-dot active" />
            </div>

            <h1 className="font-syne font-bold text-3xl text-slate-800 leading-tight mb-1">
              Yangi parol
            </h1>
            <p className="font-dm text-sm text-slate-500 font-light mb-8">
              Yangi parolingizni kiriting
            </p>

            <div className="flex flex-col gap-3.5 mb-6">
              {/* Yangi parol */}
              <div className="anim-field-1">
                <p className="font-dm text-[11px] font-medium uppercase tracking-widest text-slate-400 mb-1.5">
                  Yangi parol
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
                    className="field-input field-input-icon-right"
                    type={showNew ? 'text' : 'password'}
                    placeholder="••••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    className="eye-btn"
                    onClick={() => setShowNew(!showNew)}>
                    {showNew ?
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none">
                        <path
                          d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"
                          stroke="currentColor"
                          strokeWidth="1.3"
                        />
                        <circle
                          cx="8"
                          cy="8"
                          r="2"
                          stroke="currentColor"
                          strokeWidth="1.3"
                        />
                        <line
                          x1="2"
                          y1="2"
                          x2="14"
                          y2="14"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          strokeLinecap="round"
                        />
                      </svg>
                    : <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none">
                        <path
                          d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"
                          stroke="currentColor"
                          strokeWidth="1.3"
                        />
                        <circle
                          cx="8"
                          cy="8"
                          r="2"
                          stroke="currentColor"
                          strokeWidth="1.3"
                        />
                      </svg>
                    }
                  </button>
                </div>
              </div>

              {/* Tasdiqlash */}
              <div className="anim-field-2">
                <p className="font-dm text-[11px] font-medium uppercase tracking-widest text-slate-400 mb-1.5">
                  Parolni tasdiqlang
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
                    className="field-input field-input-icon-right"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    className="eye-btn"
                    onClick={() => setShowConfirm(!showConfirm)}>
                    {showConfirm ?
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none">
                        <path
                          d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"
                          stroke="currentColor"
                          strokeWidth="1.3"
                        />
                        <circle
                          cx="8"
                          cy="8"
                          r="2"
                          stroke="currentColor"
                          strokeWidth="1.3"
                        />
                        <line
                          x1="2"
                          y1="2"
                          x2="14"
                          y2="14"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          strokeLinecap="round"
                        />
                      </svg>
                    : <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none">
                        <path
                          d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"
                          stroke="currentColor"
                          strokeWidth="1.3"
                        />
                        <circle
                          cx="8"
                          cy="8"
                          r="2"
                          stroke="currentColor"
                          strokeWidth="1.3"
                        />
                      </svg>
                    }
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="font-dm text-[11px] text-red-400 mt-1.5">
                    Parollar mos kelmayapti
                  </p>
                )}
              </div>
            </div>

            <div className="anim-btn-1 mb-3">
              <button
                className="btn-primary"
                disabled={
                  !newPassword ||
                  newPassword !== confirmPassword ||
                  newPassword.length < 6 ||
                  resetting
                }
                onClick={() => void submitNewPassword()}>
                {resetting ? 'Saqlanmoqda...' : 'Parolni yangilash'}
              </button>
            </div>

            <div className="anim-btn-2 mt-4 text-center">
              <button
                className="font-dm text-sm text-slate-400 hover:text-violet-600 transition-colors"
                onClick={() => setStep('otp')}>
                ← Orqaga qaytish
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Muvaffaqiyat ── */}
        {step === 'success' && (
          <div className="anim-step text-center">
            <div className="anim-success success-circle">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path
                  d="M7 16.5L13 22.5L25 10"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h1 className="font-syne font-bold text-3xl text-slate-800 leading-tight mb-2">
              Muvaffaqiyatli!
            </h1>
            <p className="font-dm text-sm text-slate-500 font-light mb-8">
              Parolingiz yangilandi. Endi tizimga kirishingiz mumkin.
            </p>

            <div className="anim-btn-1">
              <Link
                href="/auth/login"
                className="btn-primary block text-center"
                style={{
                  textDecoration: 'none',
                  display: 'block',
                  padding: '13px',
                  borderRadius: '12px',
                  color: '#fff',
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 700,
                  fontSize: '15px',
                  background:
                    'linear-gradient(135deg, #634DCC 0%, #4a3aad 100%)',
                  boxShadow: '0 4px 24px rgb(99 77 220 / 0.35)',
                }}>
                Tizimga kirish
              </Link>
            </div>
          </div>
        )}

        {/* Badges */}
        {step !== 'success' && (
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
        )}
      </div>
    </div>
  );
}
