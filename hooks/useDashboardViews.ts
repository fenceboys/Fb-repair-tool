'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { DashboardView, DashboardColumn, DashboardFilter } from '@/types/admin';

interface UseDashboardViewsReturn {
  views: DashboardView[];
  loading: boolean;
  error: string | null;
  createView: (view: Omit<DashboardView, 'id' | 'created_at' | 'updated_at'>) => Promise<DashboardView | null>;
  updateView: (id: string, updates: Partial<DashboardView>) => Promise<boolean>;
  deleteView: (id: string) => Promise<boolean>;
  setDefaultView: (id: string) => Promise<boolean>;
  reorderViews: (orderedIds: string[]) => Promise<boolean>;
  refetch: () => Promise<void>;
  getDefaultView: () => DashboardView | undefined;
}

const DEFAULT_VIEW: Omit<DashboardView, 'id' | 'created_at' | 'updated_at'> = {
  name: 'All Quotes',
  sort_order: 1,
  is_default: true,
  columns: [
    { field: 'client_name', visible: true, order: 1 },
    { field: 'address', visible: true, order: 2 },
    { field: 'status', visible: true, order: 3 },
    { field: 'quote_price', visible: true, order: 4 },
    { field: 'created_at', visible: true, order: 5 },
  ],
  filters: [],
  default_sort_field: 'created_at',
  default_sort_direction: 'desc',
};

export function useDashboardViews(): UseDashboardViewsReturn {
  const [views, setViews] = useState<DashboardView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchViews = useCallback(async () => {
    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('dashboard_views')
        .select('*')
        .order('sort_order', { ascending: true });

      if (fetchError) throw fetchError;

      // If no views exist, seed with default
      if (!data || data.length === 0) {
        const { data: seededData, error: insertError } = await supabase
          .from('dashboard_views')
          .insert(DEFAULT_VIEW)
          .select()
          .single();

        if (insertError) throw insertError;
        setViews(seededData ? [seededData] : []);
        return;
      }

      setViews(data);
    } catch (err) {
      console.error('Error fetching dashboard views:', err);
      setError('Failed to load dashboard views');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchViews();
  }, [fetchViews]);

  const createView = async (view: Omit<DashboardView, 'id' | 'created_at' | 'updated_at'>): Promise<DashboardView | null> => {
    try {
      const { data, error: insertError } = await supabase
        .from('dashboard_views')
        .insert(view)
        .select()
        .single();

      if (insertError) throw insertError;

      setViews((prev) => [...prev, data].sort((a, b) => a.sort_order - b.sort_order));
      return data;
    } catch (err) {
      console.error('Error creating dashboard view:', err);
      setError('Failed to create view');
      return null;
    }
  };

  const updateView = async (id: string, updates: Partial<DashboardView>): Promise<boolean> => {
    try {
      const { data, error: updateError } = await supabase
        .from('dashboard_views')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      setViews((prev) =>
        prev.map((v) => (v.id === id ? data : v)).sort((a, b) => a.sort_order - b.sort_order)
      );
      return true;
    } catch (err) {
      console.error('Error updating dashboard view:', err);
      setError('Failed to update view');
      return false;
    }
  };

  const deleteView = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('dashboard_views')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setViews((prev) => prev.filter((v) => v.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting dashboard view:', err);
      setError('Failed to delete view');
      return false;
    }
  };

  const setDefaultView = async (id: string): Promise<boolean> => {
    try {
      // First, unset all other defaults
      const { error: resetError } = await supabase
        .from('dashboard_views')
        .update({ is_default: false })
        .neq('id', id);

      if (resetError) throw resetError;

      // Set the new default
      const { error: updateError } = await supabase
        .from('dashboard_views')
        .update({ is_default: true, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (updateError) throw updateError;

      setViews((prev) =>
        prev.map((v) => ({ ...v, is_default: v.id === id }))
      );
      return true;
    } catch (err) {
      console.error('Error setting default view:', err);
      setError('Failed to set default view');
      return false;
    }
  };

  const reorderViews = async (orderedIds: string[]): Promise<boolean> => {
    try {
      for (let i = 0; i < orderedIds.length; i++) {
        const { error: updateError } = await supabase
          .from('dashboard_views')
          .update({ sort_order: i + 1, updated_at: new Date().toISOString() })
          .eq('id', orderedIds[i]);

        if (updateError) throw updateError;
      }

      await fetchViews();
      return true;
    } catch (err) {
      console.error('Error reordering views:', err);
      setError('Failed to reorder views');
      return false;
    }
  };

  const getDefaultView = (): DashboardView | undefined => {
    return views.find((v) => v.is_default) || views[0];
  };

  return {
    views,
    loading,
    error,
    createView,
    updateView,
    deleteView,
    setDefaultView,
    reorderViews,
    refetch: fetchViews,
    getDefaultView,
  };
}

// Available dashboard columns
export const AVAILABLE_COLUMNS: { field: string; label: string }[] = [
  { field: 'client_name', label: 'Customer' },
  { field: 'phone', label: 'Phone' },
  { field: 'email', label: 'Email' },
  { field: 'address', label: 'Address' },
  { field: 'city_state', label: 'City/State' },
  { field: 'status', label: 'Status' },
  { field: 'quote_price', label: 'Quote Price' },
  { field: 'deposit', label: 'Deposit' },
  { field: 'base_cost', label: 'Base Cost' },
  { field: 'scheduled_date', label: 'Scheduled Date' },
  { field: 'quote_appointment_date', label: 'Quote Appointment' },
  { field: 'created_at', label: 'Created' },
  { field: 'updated_at', label: 'Updated' },
];

// Available filter operators
export const FILTER_OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
] as const;
