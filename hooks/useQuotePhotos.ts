'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import type { QuotePhoto } from '@/types/photo';

export function useQuotePhotos(quoteId: string | null) {
  // Use the session-aware browser client so RLS sees authenticated reads.
  // The default @/lib/supabase client uses the anon key without cookie pickup,
  // which would fail the "authenticated" policy on quote_photos.
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [photos, setPhotos] = useState<QuotePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPhotos = useCallback(async () => {
    if (!quoteId) {
      setPhotos([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: fetchErr } = await supabase
      .from('quote_photos')
      .select('*')
      .eq('quote_id', quoteId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (fetchErr) {
      setError(fetchErr.message);
      setPhotos([]);
    } else {
      setPhotos((data ?? []) as QuotePhoto[]);
    }
    setLoading(false);
  }, [quoteId, supabase]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const uploadPhoto = useCallback(
    async (file: File): Promise<QuotePhoto | null> => {
      if (!quoteId) return null;
      const form = new FormData();
      form.append('file', file);
      form.append('quoteId', quoteId);
      const res = await fetch('/api/upload-photo', {
        method: 'POST',
        body: form,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || `Upload failed (${res.status})`);
        return null;
      }
      const { photo } = (await res.json()) as { photo: QuotePhoto };
      setPhotos((prev) => [...prev, photo]);
      return photo;
    },
    [quoteId]
  );

  const deletePhoto = useCallback(async (id: string): Promise<boolean> => {
    const res = await fetch(
      `/api/upload-photo?id=${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    );
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
