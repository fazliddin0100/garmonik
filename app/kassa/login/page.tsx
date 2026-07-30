"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Lock,
  ShieldCheck,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import { Button } from "@/components/kassa/ui/button";
import { Input } from "@/components/kassa/ui/input";
import { Label } from "@/components/kassa/ui/label";
import { CLINIC_LOGO_PATH, getClinicName } from "@/lib/kassa/receipt-branding";

export default function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const clinicName = getClinicName();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/kassa/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Kirish amalga oshmadi");
        return;
      }

      router.push(data.role === "ADMIN" ? "/kassa-admin" : "/kassa");
      router.refresh();
    } catch {
      setError("Server bilan aloqa yo'q");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="mesh-login relative hidden w-1/2 flex-col justify-between overflow-hidden p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl" />

        <div className="relative animate-fade-in flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={CLINIC_LOGO_PATH}
            alt=""
            className="h-12 w-12 rounded-2xl object-contain ring-2 ring-white/20"
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-300">
              Professional POS
            </p>
            <p className="text-lg font-bold">{clinicName}</p>
          </div>
        </div>

        <div className="relative animate-fade-up space-y-8">
          <div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
              Zamonaviy
              <br />
              <span className="bg-gradient-to-r from-violet-300 to-emerald-300 bg-clip-text text-transparent">
                kassa tizimi
              </span>
            </h1>
            <p className="mt-4 max-w-md text-lg text-slate-300">
              To&apos;lovlar, cheklar, hisobotlar va xarajatlarni bir joyda boshqaring
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: Zap, text: "Tez to'lov qabul qilish va chek chop etish" },
              { icon: ShieldCheck, text: "Xavfsiz kirish va rol asosida boshqaruv" },
              { icon: Sparkles, text: "Kunlik moliyaviy hisobotlar va tahlil" },
            ].map(({ icon: Icon, text }, i) => (
              <div
                key={text}
                className="animate-slide-right flex items-center gap-3 text-slate-300"
                style={{ animationDelay: `${200 + i * 100}ms` }}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="h-4 w-4 text-violet-300" />
                </div>
                <span className="text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-slate-500">
          © {new Date().getFullYear()} {clinicName}
        </p>
      </div>

      <div className="mesh-admin flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="animate-scale-in w-full max-w-md">
          <div className="mb-8 text-center lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={CLINIC_LOGO_PATH}
              alt=""
              className="mx-auto mb-4 h-14 w-14 rounded-2xl object-contain shadow-lg"
            />
            <h1 className="text-2xl font-bold text-slate-900">{clinicName}</h1>
            <p className="text-sm text-muted-foreground">Kassir va to&apos;lov tizimi</p>
          </div>

          <div className="glass-panel rounded-3xl p-8">
            <div className="mb-8 hidden lg:block">
              <h2 className="text-2xl font-bold text-slate-900">Tizimga kirish</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Login va parolingizni kiriting
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="login">Login</Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="login"
                    className="pl-10"
                    placeholder="admin@klinika yoki kassir login"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    required
                    autoComplete="username"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Parol</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {error && (
                <p className="animate-fade-in rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Kirish..." : "Tizimga kirish"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Sessiya 30 daqiqadan keyin tugaydi
            </p>
            {process.env.NODE_ENV === "development" && (
              <p className="mt-3 rounded-xl bg-violet-50 px-4 py-3 text-center text-xs text-violet-900">
                Demo: <strong>admin@klinika</strong> / <strong>admin123</strong>
                {" · "}
                kassir: <strong>kassir1</strong> / <strong>kassir123</strong>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
