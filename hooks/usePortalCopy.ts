'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { PortalCopy, DEFAULT_PORTAL_COPY } from '@/types/admin';

interface UsePortalCopyReturn {
  portalCopy: PortalCopy[];
  loading: boolean;
  error: string | null;
  updatePortalCopy: (statusKey: string, updates: Partial<PortalCopy>) => Promise<boolean>;
  resetToDefaults: () => Promise<boolean>;
  refetch: () => Promise<void>;
  getCopyByStatus: (statusKey: string) => PortalCopy | undefined;
}

export function usePortalCopy(): UsePortalCopyReturn {
  const [portalCopy, setPortalCopy] = useState<PortalCopy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPortalCopy = useCallback(async () => {
    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('portal_copy')
        .select('*')
        .order('status_key', { ascending: true });

      if (fetchError) throw fetchError;

      // If no portal copy exists, seed with defaults
      if (!data || data.length === 0) {
        const { data: seededData, error: insertError } = await supabase
          .from('portal_copy')
          .insert(DEFAULT_PORTAL_COPY)
          .select();

        if (insertError) throw insertError;
        setPortalCopy(seededData || []);
        return;
      }

      setPortalCopy(data);
    } catch (err) {
      console.error('Error fetching portal copy:', err);
      setError('Failed to load portal copy');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortalCopy();
  }, [fetchPortalCopy]);

  const updatePortalCopy = async (statusKey: string, updates: Partial<PortalCopy>): Promise<boolean> => {
    try {
      const { data, error: updateError } = await supabase
        .from('portal_copy')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('status_key', statusKey)
        .select()
        .single();

      if (updateError) throw updateError;

      setPortalCopy((prev) =>
        prev.map((p) => (p.status_key === statusKey ? data : p))
      );
      return true;
    } catch (err) {
      console.error('Error updating portal copy:', err);
      setError('Failed to update portal copy');
      return false;
    }
  };

  const resetToDefaults = async (): Promise<boolean> => {
    try {
      // Delete all existing and re-insert defaults
      const { error: deleteError } = await supabase
        .from('portal_copy')
        .delete()
        .neq('status_key', '');

      if (deleteError) throw deleteError;

      const { data: seededData, error: insertError } = await supabase
        .from('portal_copy')
        .insert(DEFAULT_PORTAL_COPY)
        .select();

      if (insertError) throw insertError;

      setPortalCopy(seededData || []);
      return true;
    } catch (err) {
      console.error('Error resetting portal copy:', err);
      setError('Failed to reset portal copy');
      return false;
    }
  };

  const getCopyByStatus = (statusKey: string): PortalCopy | undefined => {
    return portalCopy.find((p) => p.status_key === statusKey);
  };

  return {
    portalCopy,
    loading,
    error,
    updatePortalCopy,
    resetToDefaults,
    refetch: fetchPortalCopy,
    getCopyByStatus,
  };
}
