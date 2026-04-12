'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { NotificationTemplate, DEFAULT_NOTIFICATION_TEMPLATES } from '@/types/admin';

interface UseNotificationTemplatesReturn {
  templates: NotificationTemplate[];
  loading: boolean;
  error: string | null;
  updateTemplate: (statusKey: string, updates: Partial<NotificationTemplate>) => Promise<boolean>;
  resetToDefaults: () => Promise<boolean>;
  refetch: () => Promise<void>;
  getTemplateByStatus: (statusKey: string) => NotificationTemplate | undefined;
}

export function useNotificationTemplates(): UseNotificationTemplatesReturn {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('notification_templates')
        .select('*')
        .order('status_key', { ascending: true });

      if (fetchError) throw fetchError;

      // If no templates exist, seed with defaults
      if (!data || data.length === 0) {
        const { data: seededData, error: insertError } = await supabase
          .from('notification_templates')
          .insert(DEFAULT_NOTIFICATION_TEMPLATES)
          .select();

        if (insertError) throw insertError;
        setTemplates(seededData || []);
        return;
      }

      setTemplates(data);
    } catch (err) {
      console.error('Error fetching notification templates:', err);
      setError('Failed to load notification templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const updateTemplate = async (statusKey: string, updates: Partial<NotificationTemplate>): Promise<boolean> => {
    try {
      const { data, error: updateError } = await supabase
        .from('notification_templates')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('status_key', statusKey)
        .select()
        .single();

      if (updateError) throw updateError;

      setTemplates((prev) =>
        prev.map((t) => (t.status_key === statusKey ? data : t))
      );
      return true;
    } catch (err) {
      console.error('Error updating notification template:', err);
      setError('Failed to update template');
      return false;
    }
  };

  const resetToDefaults = async (): Promise<boolean> => {
    try {
      // Delete all existing and re-insert defaults
      const { error: deleteError } = await supabase
        .from('notification_templates')
        .delete()
        .neq('status_key', '');

      if (deleteError) throw deleteError;

      const { data: seededData, error: insertError } = await supabase
        .from('notification_templates')
        .insert(DEFAULT_NOTIFICATION_TEMPLATES)
        .select();

      if (insertError) throw insertError;

      setTemplates(seededData || []);
      return true;
    } catch (err) {
      console.error('Error resetting notification templates:', err);
      setError('Failed to reset templates');
      return false;
    }
  };

  const getTemplateByStatus = (statusKey: string): NotificationTemplate | undefined => {
    return templates.find((t) => t.status_key === statusKey);
  };

  return {
    templates,
    loading,
    error,
    updateTemplate,
    resetToDefaults,
    refetch: fetchTemplates,
    getTemplateByStatus,
  };
}

// Helper to replace merge tags in template
export function replaceMergeTags(
  template: string,
  data: {
    customer_name?: string | null;
    phone?: string | null;
    address?: string | null;
    city_state?: string | null;
    quote_price?: number;
    deposit?: number;
    scheduled_date?: string | null;
    repair_description?: string | null;
  }
): string {
  let result = template;

  result = result.replace(/\{\{customer_name\}\}/g, data.customer_name || 'Customer');
  result = result.replace(/\{\{phone\}\}/g, data.phone || '');
  result = result.replace(/\{\{address\}\}/g, data.address || '');
  result = result.replace(/\{\{city_state\}\}/g, data.city_state || '');
  result = result.replace(/\{\{quote_price\}\}/g, data.quote_price ? `$${data.quote_price.toLocaleString()}` : '');
  result = result.replace(/\{\{deposit\}\}/g, data.deposit ? `$${data.deposit.toLocaleString()}` : '');

  if (data.scheduled_date) {
    const date = new Date(data.scheduled_date);
    const formatted = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
    result = result.replace(/\{\{scheduled_date\}\}/g, formatted);
  } else {
    result = result.replace(/\{\{scheduled_date\}\}/g, '');
  }

  result = result.replace(/\{\{repair_description\}\}/g, data.repair_description || '');

  return result;
}
