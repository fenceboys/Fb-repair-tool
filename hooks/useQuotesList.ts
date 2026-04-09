'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { RepairQuote } from '@/types/quote';

export function useQuotesList() {
  const [quotes, setQuotes] = useState<RepairQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('repair_quotes')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchQuery.trim()) {
        query = query.or(
          `client_name.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`
        );
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setQuotes(data || []);
    } catch (err) {
      console.error('Error fetching quotes:', err);
      setError('Failed to load quotes');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  const createQuote = async (): Promise<string | null> => {
    try {
      const { data, error: createError } = await supabase
        .from('repair_quotes')
        .insert({
          client_name: '',
          phone: '',
          email: '',
          address: '',
          city_state: '',
          zip: '',
          repair_description: '',
          line_items: [],
          base_cost: 0,
          quote_price: 0,
          misc: 0,
          deposit: 0,
          status: 'draft',
        })
        .select()
        .single();

      if (createError) throw createError;

      // Refresh the list
      await fetchQuotes();

      return data?.id || null;
    } catch (err) {
      console.error('Error creating quote:', err);
      setError('Failed to create quote');
      return null;
    }
  };

  const deleteQuote = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('repair_quotes')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      // Update local state
      setQuotes(prev => prev.filter(q => q.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting quote:', err);
      setError('Failed to delete quote');
      return false;
    }
  };

  return {
    quotes,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    createQuote,
    deleteQuote,
    refresh: fetchQuotes,
  };
}
