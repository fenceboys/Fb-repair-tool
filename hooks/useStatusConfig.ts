'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { StatusConfig, DEFAULT_STATUS_CONFIG } from '@/types/admin';

interface UseStatusConfigReturn {
  statuses: StatusConfig[];
  loading: boolean;
  error: string | null;
  updateStatus: (statusKey: string, updates: Partial<StatusConfig>) => Promise<boolean>;
  reorderStatuses: (orderedKeys: string[]) => Promise<boolean>;
  resetToDefaults: () => Promise<boolean>;
  refetch: () => Promise<void>;
  getStatusByKey: (key: string) => StatusConfig | undefined;
}

export function useStatusConfig(): UseStatusConfigReturn {
  const [statuses, setStatuses] = useState<StatusConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatuses = useCallback(async () => {
    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('status_config')
        .select('*')
        .order('sort_order', { ascending: true });

      if (fetchError) throw fetchError;

      // If no statuses exist, seed with defaults
      if (!data || data.length === 0) {
        const { data: seededData, error: insertError } = await supabase
          .from('status_config')
          .insert(DEFAULT_STATUS_CONFIG)
          .select();

        if (insertError) throw insertError;
        setStatuses(seededData || []);
        return;
      }

      setStatuses(data);
    } catch (err) {
      console.error('Error fetching status config:', err);
      setError('Failed to load status configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  const updateStatus = async (statusKey: string, updates: Partial<StatusConfig>): Promise<boolean> => {
    try {
      const { data, error: updateError } = await supabase
        .from('status_config')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('status_key', statusKey)
        .select()
        .single();

      if (updateError) throw updateError;

      setStatuses((prev) =>
        prev.map((s) => (s.status_key === statusKey ? data : s))
      );
      return true;
    } catch (err) {
      console.error('Error updating status config:', err);
      setError('Failed to update status');
      return false;
    }
  };

  const reorderStatuses = async (orderedKeys: string[]): Promise<boolean> => {
    try {
      const updates = orderedKeys.map((key, index) => ({
        status_key: key,
        sort_order: index + 1,
      }));

      // Update each status's sort_order
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('status_config')
          .update({ sort_order: update.sort_order, updated_at: new Date().toISOString() })
          .eq('status_key', update.status_key);

        if (updateError) throw updateError;
      }

      // Refetch to get updated order
      await fetchStatuses();
      return true;
    } catch (err) {
      console.error('Error reordering statuses:', err);
      setError('Failed to reorder statuses');
      return false;
    }
  };

  const resetToDefaults = async (): Promise<boolean> => {
    try {
      // Delete all existing and re-insert defaults
      const { error: deleteError } = await supabase
        .from('status_config')
        .delete()
        .neq('status_key', ''); // Delete all

      if (deleteError) throw deleteError;

      const { data: seededData, error: insertError } = await supabase
        .from('status_config')
        .insert(DEFAULT_STATUS_CONFIG)
        .select();

      if (insertError) throw insertError;

      setStatuses(seededData || []);
      return true;
    } catch (err) {
      console.error('Error resetting status config:', err);
      setError('Failed to reset statuses');
      return false;
    }
  };

  const getStatusByKey = (key: string): StatusConfig | undefined => {
    return statuses.find((s) => s.status_key === key);
  };

  return {
    statuses,
    loading,
    error,
    updateStatus,
    reorderStatuses,
    resetToDefaults,
    refetch: fetchStatuses,
    getStatusByKey,
  };
}
