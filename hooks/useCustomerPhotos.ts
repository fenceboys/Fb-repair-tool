'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import type { QuotePhoto } from '@/types/photo';

// Customer-scoped (property-level) photo list. Photos are the same physical
// fence/job-site regardless of which priced variant Colt is currently looking
// at, so they live on the customer record.
export function useCustomerPhotos(customerId: string | null) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [photos, setPhotos] = useState<QuotePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPhotos = useCallback(async () => {
    if (!customerId) {
      setPhotos([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: fetchErr } = await supabase
      .from('quote_photos')
      .select('*')
      .eq('customer_id', customerId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (fetchErr) {
      setError(fetchErr.message);
      setPhotos([]);
    } else {
      setPhotos((data ?? []) as QuotePhoto[]);
    }
    setLoading(false);
  }, [customerId, supabase]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const uploadPhoto = useCallback(
    async (file: File): Promise<QuotePhoto | null> => {
      if (!customerId) return null;
      const form = new FormData();
      form.append('file', file);
      form.append('customerId', customerId);
      const res = await fetch('/api/upload-photo', { method: 'POST', body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || `Upload failed (${res.status})`);
        return null;
      }
      const { photo } = (await res.json()) as { photo: QuotePhoto };
      setPhotos((prev) => [...prev, photo]);
      return photo;
    },
    [customerId]
  );

  const deletePhoto = useCallback(async (id: string): Promise<boolean> => {
    const res = await fetch(`/api/upload-photo?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error || `Delete failed (${res.status})`);
      return false;
    }
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    return true;
  }, []);

  return { photos, loading, error, uploadPhoto, deletePhoto, refetch: fetchPhotos };
}
