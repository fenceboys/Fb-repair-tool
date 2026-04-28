'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { RepairQuote } from '@/types/quote';
import { generateSignatureDataUrl } from '@/lib/calculations';
import { notifyQuoteScheduled } from '@/lib/slackNotifications';

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
        .is('deleted_at', null)
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
      // Pre-generate salesperson signature for Colt Stonerook
      const salespersonSignature = generateSignatureDataUrl('Colt Stonerook');

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
          status: 'scheduling_quote',
          salesperson_signature: salespersonSignature,
        })
        .select()
        .single();

      if (createError) throw createError;

      return data?.id || null;
    } catch (err) {
      console.error('Error creating quote:', err);
      setError('Failed to create quote');
      return null;
    }
  };

  // Soft-delete: sets deleted_at so the row is hidden from lists but recoverable
  // from /trash. Hard deletion only happens from the trash "Permanently delete"
  // button.
  const deleteQuote = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('repair_quotes')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (deleteError) throw deleteError;

      setQuotes(prev => prev.filter(q => q.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting quote:', err);
      setError('Failed to delete quote');
      return false;
    }
  };

  const updateStatus = async (id: string, status: RepairQuote['status']): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('repair_quotes')
        .update({ status })
        .eq('id', id);

      if (updateError) throw updateError;

      // Update local state
      setQuotes(prev => prev.map(q => q.id === id ? { ...q, status } : q));
      return true;
    } catch (err) {
      console.error('Error updating quote status:', err);
      setError('Failed to update status');
      return false;
    }
  };

  const scheduleQuote = async (id: string, appointmentDate: string): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('repair_quotes')
        .update({
          status: 'quote_scheduled',
          quote_appointment_date: appointmentDate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Get the quote data for Slack notification
      const quote = quotes.find(q => q.id === id);
      if (quote) {
        // Send Slack notification
        notifyQuoteScheduled(quote, appointmentDate);
      }

      // Update local state
      setQuotes(prev => prev.map(q =>
        q.id === id
          ? { ...q, status: 'quote_scheduled', quote_appointment_date: appointmentDate }
          : q
      ));
      return true;
    } catch (err) {
      console.error('Error scheduling quote:', err);
      setError('Failed to schedule quote');
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
    updateStatus,
    scheduleQuote,
    refresh: fetchQuotes,
  };
}
