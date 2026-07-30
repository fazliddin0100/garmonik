'use client';

import Link from 'next/link';

export default function RegistrationClosedPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center p-8">
      <div
        className="absolute inset-0 -z-20"
        style={{ background: 'url(/image/bagr2.jpg) center/cover no-repeat' }}
      />
      <div className="absolute inset-0 -z-10 backdrop-blur-sm bg-white/30" />

      <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/60 bg-white/80 backdrop-blur-xl shadow-2xl px-10 py-10 text-center">
        <h1 className="text-xl font-semibold text-slate-800 mb-2">
          Ochiq ro&apos;yxatdan o&apos;tish yo&apos;q
        </h1>
        <p className="text-sm text-slate-600 mb-6">
          Yangi foydalanuvchilarni faqat tizim administratori yoki kadrlar
          bo&apos;limi vakolatli xodimlari qo&apos;shadi. Hisob ochish uchun
          klinika boshqaruvchiga murojaat qiling.
        </p>
        <Link
          href="/auth/login"
          className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-700">
          Kirish sahifasiga qaytish
        </Link>
      </div>
    </div>
  );
}
