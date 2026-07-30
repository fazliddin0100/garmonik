import { useState } from 'react';

async function postAdminLoginJson(login: string, password: string) {
  let res = await fetch('/api/auth/admin-login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password }),
  });
  let text = await res.text();

  if (res.status === 404) {
    res = await fetch('/api/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password }),
    });
    text = await res.text();
  }

  let data: { error?: string } = {};
  try {
    data = JSON.parse(text) as { error?: string };
  } catch {
    throw new Error(
      res.status === 404 ?
        'Login API topilmadi (404). Dev serverni qayta ishga tushiring.'
      : 'Serverdan noto‘g‘ri javob keldi',
    );
  }

  return { res, data };
}

export function useClinicLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function login(
    login: string,
    password: string,
  ): Promise<string | null> {
    setLoading(true);
    setError('');

    try {
      const { res, data } = await postAdminLoginJson(login, password);
      if (!res.ok) throw new Error(data.error || 'Xatolik yuz berdi');

      const me = await fetch('/api/auth/me', { credentials: 'include' });
      const session = await me.json();
      if (session?.kind === 'admin' && session.id) return session.id as string;
      return 'ok';
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Xatolik yuz berdi');
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { login, loading, error };
}
