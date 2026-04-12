'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { AppConfig, DEFAULT_APP_CONFIG } from '@/types/admin';

interface UseAdminConfigReturn {
  config: AppConfig | null;
  loading: boolean;
  error: string | null;
  updateConfig: (updates: Partial<AppConfig>) => Promise<boolean>;
  resetToDefaults: () => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useAdminConfig(): UseAdminConfigReturn {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('app_config')
        .select('*')
        .limit(1)
        .single();

      if (fetchError) {
        // If no row exists, create one with defaults
        if (fetchError.code === 'PGRST116') {
          const { data: newConfig, error: insertError } = await supabase
            .from('app_config')
            .insert(DEFAULT_APP_CONFIG)
            .select()
            .single();

          if (insertError) throw insertError;
          setConfig(newConfig);
          return;
        }
        throw fetchError;
      }

      setConfig(data);
    } catch (err) {
      console.error('Error fetching app config:', err);
      setError('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const updateConfig = async (updates: Partial<AppConfig>): Promise<boolean> => {
    if (!config) return false;

    try {
      const { data, error: updateError } = await supabase
        .from('app_config')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', config.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setConfig(data);
      return true;
    } catch (err) {
      console.error('Error updating app config:', err);
      setError('Failed to update configuration');
      return false;
    }
  };

  const resetToDefaults = async (): Promise<boolean> => {
    if (!config) return false;

    try {
      const { data, error: updateError } = await supabase
        .from('app_config')
        .update({ ...DEFAULT_APP_CONFIG, updated_at: new Date().toISOString() })
        .eq('id', config.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setConfig(data);
      return true;
    } catch (err) {
      console.error('Error resetting app config:', err);
      setError('Failed to reset configuration');
      return false;
    }
  };

  return {
    config,
    loading,
    error,
    updateConfig,
    resetToDefaults,
    refetch: fetchConfig,
  };
}
