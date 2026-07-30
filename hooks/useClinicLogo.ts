import { useState } from 'react';

export function useClinicLogo() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function uploadLogo(logo: File, clinicId: string): Promise<boolean> {
    setLoading(true);
    setError('');

    // Validatsiya
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(logo.type)) {
      setError('Faqat PNG yoki JPG formatida yuklang');
      setLoading(false);
      return false;
    }

    if (logo.size > 15 * 1024 * 1024) {
      setError('Fayl hajmi 15 MB dan oshmasligi kerak');
      setLoading(false);
      return false;
    }

    try {
      const formData = new FormData();
      formData.append('logo', logo);
      formData.append('clinicId', clinicId);

      const res = await fetch('/api/klinika/logo', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Xatolik yuz berdi');
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Xatolik yuz berdi');
      return false;
    } finally {
      setLoading(false);
    }
  }

  return { uploadLogo, loading, error };
}
