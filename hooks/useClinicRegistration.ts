import { useState } from 'react';

export function useClinicRegistration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function register(clinicName: string): Promise<string | null> {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/klinika/name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicName }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Xatolik yuz berdi');

      return data._id; 
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Xatolik yuz berdi');
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { register, loading, error };
}
