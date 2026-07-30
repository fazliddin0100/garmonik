'use client';

/** Cookie asosidagi so‘rovlar (localStorage token yo‘q) */
export async function fetchClinicResource<T>(key: string): Promise<T> {
  const res = await fetch(`/api/clinic-data/${key}`, {
    credentials: 'include',
    cache: 'no-store',
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || res.statusText);
  }
  const json = (await res.json()) as { data?: T };
  if (json.data === undefined) {
    throw new Error('Noto‘g‘ri javob');
  }
  return json.data;
}

export async function saveClinicResource<T>(key: string, data: T): Promise<void> {
  const res = await fetch(`/api/clinic-data/${key}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
}
