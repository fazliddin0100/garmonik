"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Shield, Trash2, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/kassa/ui/button";
import { PageHeader } from "@/components/kassa/ui/page-header";
import { Input } from "@/components/kassa/ui/input";
import { Label } from "@/components/kassa/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/kassa/ui/card";
import { Badge } from "@/components/kassa/ui/badge";

type UserRole = "ADMIN" | "CASHIER";

type User = {
  id: string;
  login: string;
  fullName: string;
  role: string;
  isActive: boolean;
  lockedUntil?: string | null;
};

type EditForm = {
  fullName: string;
  login: string;
  newPassword: string;
  isActive: boolean;
};

type Tab = UserRole;

const TAB_META: Record<
  Tab,
  { title: string; addTitle: string; listTitle: string; activeLabel: string }
> = {
  CASHIER: {
    title: "Kassirlar",
    addTitle: "Yangi kassir",
    listTitle: "Kassirlar ro'yxati",
    activeLabel: "Faol kassir",
  },
  ADMIN: {
    title: "Administratorlar",
    addTitle: "Yangi admin",
    listTitle: "Adminlar ro'yxati",
    activeLabel: "Faol admin",
  },
};

export function CashiersView({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [tab, setTab] = useState<Tab>("CASHIER");
  const [showInactive, setShowInactive] = useState(false);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    fullName: "",
    login: "",
    newPassword: "",
    isActive: true,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const meta = TAB_META[tab];

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (u.role !== tab) return false;
      if (!showInactive && !u.isActive) return false;
      return true;
    });
  }, [users, tab, showInactive]);

  function load() {
    fetch("/api/kassa/users")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setUsers(data);
      })
      .catch(() => setUsers([]));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    cancelEdit();
    setError("");
    setSuccess("");
  }, [tab]);

  function startEdit(user: User) {
    setEditId(user.id);
    setEditForm({
      fullName: user.fullName,
      login: user.login,
      newPassword: "",
      isActive: user.isActive,
    });
    setError("");
    setSuccess("");
  }

  function cancelEdit() {
    setEditId(null);
    setEditForm({ fullName: "", login: "", newPassword: "", isActive: true });
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/kassa/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password, fullName, role: tab }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Qo'shishda xatolik");
        return;
      }

      setLogin("");
      setPassword("");
      setFullName("");
      setSuccess(
        tab === "ADMIN" ? "Admin muvaffaqiyatli qo'shildi" : "Kassir muvaffaqiyatli qo'shildi"
      );
      load();
    } catch {
      setError("Server bilan aloqa yo'q");
    } finally {
      setLoading(false);
    }
  }

  async function saveUser(id: string) {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const payload: Record<string, unknown> = {
        userId: id,
        fullName: editForm.fullName.trim(),
        login: editForm.login.trim(),
        isActive: editForm.isActive,
      };

      if (editForm.newPassword.trim()) {
        payload.newPassword = editForm.newPassword;
      }

      const res = await fetch("/api/kassa/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Saqlashda xatolik");
        return;
      }

      setSuccess("Ma'lumotlar yangilandi");
      cancelEdit();
      load();
    } catch {
      setError("Server bilan aloqa yo'q");
    } finally {
      setLoading(false);
    }
  }

  async function deleteUser(user: User) {
    const label = user.role === "ADMIN" ? "admin" : "kassir";
    if (
      !window.confirm(
        `"${user.fullName}" (${user.login}) ${label}ni o'chirishni tasdiqlaysizmi?\n\nTarix bo'lsa — nofaol holatga o'tkaziladi.`
      )
    ) {
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/kassa/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "O'chirib bo'lmadi");
        return;
      }

      setSuccess(data.message || "Foydalanuvchi o'chirildi");
      if (editId === user.id) cancelEdit();
      load();
    } catch {
      setError("Server bilan aloqa yo'q");
    } finally {
      setLoading(false);
    }
  }

  function renderUserRow(user: User) {
    const isSelf = user.id === currentUserId;

    if (editId === user.id) {
      return (
        <div className="space-y-3 rounded-xl border border-sky-100 bg-sky-50/40 p-4">
          <div className="space-y-2">
            <Label>Ism familiya</Label>
            <Input
              value={editForm.fullName}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, fullName: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Login</Label>
            <Input
              value={editForm.login}
              onChange={(e) => setEditForm((prev) => ({ ...prev, login: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Yangi parol</Label>
            <Input
              type="password"
              value={editForm.newPassword}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, newPassword: e.target.value }))
              }
              placeholder="Bo'sh qoldirsangiz o'zgarmaydi"
              minLength={6}
            />
          </div>
          {!isSelf && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editForm.isActive}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, isActive: e.target.checked }))
                }
                className="h-4 w-4 rounded border"
              />
              {meta.activeLabel}
            </label>
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={loading} onClick={() => saveUser(user.id)}>
              Saqlash
            </Button>
            <Button size="sm" variant="ghost" onClick={cancelEdit}>
              Bekor
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">
            {user.fullName}
            {isSelf && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">(siz)</span>
            )}
          </p>
          <p className="text-sm text-muted-foreground">{user.login}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={user.isActive ? "secondary" : "outline"}>
              {user.isActive ? "Faol" : "Nofaol"}
            </Badge>
            {user.role === "ADMIN" && (
              <Badge variant="outline" className="border-violet-200 text-violet-700">
                Admin
              </Badge>
            )}
            {user.lockedUntil && new Date(user.lockedUntil) > new Date() && (
              <Badge variant="destructive">Bloklangan</Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => startEdit(user)}
          >
            <Pencil className="h-4 w-4" />
            Tahrirlash
          </Button>
          {!isSelf && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-destructive hover:text-destructive"
              disabled={loading}
              onClick={() => deleteUser(user)}
            >
              <Trash2 className="h-4 w-4" />
              O&apos;chirish
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Users}
        title="Foydalanuvchilar"
        description="Kassir va adminlarni qo'shish, tahrirlash, parolni almashtirish"
        accent="sky"
      />

      <div className="flex flex-wrap gap-2">
        <Button
          variant={tab === "CASHIER" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("CASHIER")}
        >
          Kassirlar
        </Button>
        <Button
          variant={tab === "ADMIN" ? "default" : "outline"}
          size="sm"
          className="gap-2"
          onClick={() => setTab("ADMIN")}
        >
          <Shield className="h-4 w-4" />
          Administratorlar
        </Button>
      </div>

      {(error || success) && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            error
              ? "bg-destructive/10 text-destructive"
              : "bg-emerald-50 text-emerald-800"
          }`}
        >
          {error || success}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden border-sky-100">
          <CardHeader className="border-b border-sky-50 bg-gradient-to-r from-sky-50/80 to-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600">
                {tab === "ADMIN" ? (
                  <Shield className="h-5 w-5" />
                ) : (
                  <UserPlus className="h-5 w-5" />
                )}
              </div>
              <CardTitle>{meta.addTitle}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={createUser} className="space-y-4">
              <div className="space-y-2">
                <Label>Ism familiya</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={
                    tab === "ADMIN" ? "Masalan: Admin Karimov" : "Masalan: Dilnoza Karimova"
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Login</Label>
                <Input
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder={tab === "ADMIN" ? "admin2 yoki email" : "kassir2 yoki email"}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Parol</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? "Saqlanmoqda..." : "Qo'shish"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
            <CardTitle>
              {meta.listTitle} ({filteredUsers.length})
            </CardTitle>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="h-4 w-4 rounded border"
              />
              Nofaollarni ko&apos;rsatish
            </label>
          </CardHeader>
          <CardContent>
            {filteredUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {tab === "ADMIN"
                  ? "Hali admin qo'shilmagan"
                  : "Hali kassir qo'shilmagan"}
              </p>
            ) : (
              <ul className="divide-y">
                {filteredUsers.map((user) => (
                  <li key={user.id} className="py-4 first:pt-0 last:pb-0">
                    {renderUserRow(user)}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
