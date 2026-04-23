'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { RepairQuote, RepairQuoteUpdate } from '@/types/quote';

export function useQuote(id: string | null) {
  const [quote, setQuote] = useState<RepairQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingChangesRef = useRef<RepairQuoteUpdate | null>(null);

  // Fetch quote on mount
  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const fetchQuote = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('repair_quotes')
          .select('*')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;
        setQuote(data);
      } catch (err) {
        console.error('Error fetching quote:', err);
        setError('Failed to load quote');
      } finally {
        setLoading(false);
      }
    };

    fetchQuote();
  }, [id]);

  // Save function
  const saveToDatabase = useCallback(async (updates: RepairQuoteUpdate) => {
    if (!id) return;

    setSaveStatus('saving');

    try {
      const { error: updateError } = await supabase
        .from('repair_quotes')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) throw updateError;
      setSaveStatus('saved');

      // Reset to idle after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Error saving quote:', err);
      setSaveStatus('error');
    }
  }, [id]);

  // Debounced update function
  const updateQuote = useCallback((updates: RepairQuoteUpdate) => {
    if (!quote) return;

    // Update local state immediately
    setQuote(prev => {
      if (!prev) return null;
      return { ...prev, ...updates };
    });

    // Accumulate pending changes
    pendingChangesRef.current = {
      ...pendingChangesRef.current,
      ...updates,
    };

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for debounced save (500ms)
    setSaveStatus('saving');
    saveTimeoutRef.current = setTimeout(() => {
      if (pendingChangesRef.current) {
        saveToDatabase(pendingChangesRef.current);
        pendingChangesRef.current = null;
      }
    }, 500);
  }, [quote, saveToDatabase]);

  // Update a single field
  const updateField = useCallback(<K extends keyof RepairQuote>(
    field: K,
    value: RepairQuote[K]
  ) => {
    updateQuote({ [field]: value } as RepairQuoteUpdate);
  }, [updateQuote]);

  // Set base cost - calculates total and misc automatically
  const setBaseCost = useCallback((baseCost: number) => {
    if (!quote) return;

    // Calculate total with 33% margin
    const markedUpPrice = baseCost > 0 ? baseCost / 0.67 : 0;
    const total = Math.ceil(markedUpPrice / 10) * 10;

    // Calculate misc as difference between current sell price and new total
    const sellPrice = quote.quote_price || 0;
    const misc = sellPrice - total;

    updateQuote({
      base_cost: baseCost,
      misc,
    });
  }, [quote, updateQuote]);

  // Set sell price - recalculates misc and deposit
  const setSellPrice = useCallback((sellPrice: number) => {
    if (!quote) return;

    // Calculate total from base cost
    const baseCost = quote.base_cost || 0;
    const markedUpPrice = baseCost > 0 ? baseCost / 0.67 : 0;
    const total = Math.ceil(markedUpPrice / 10) * 10;

    // Misc is difference between sell price and total
    const misc = sellPrice - total;
    const deposit = Math.round(sellPrice * 0.5 * 100) / 100;

    updateQuote({
      quote_price: sellPrice,
      misc,
      deposit,
    });
  }, [quote, updateQuote]);

  // Set material cost - recomputes base_cost (= material + labor) and cascades
  // through the same markup/misc math as setBaseCost so the sell price is preserved.
  const setMaterialCost = useCallback((value: number) => {
    if (!quote) return;
    const labor = quote.labor_cost ?? 0;
    const newBaseCost = value + labor;
    const markedUpPrice = newBaseCost > 0 ? newBaseCost / 0.67 : 0;
    const total = Math.ceil(markedUpPrice / 10) * 10;
    const sellPrice = quote.quote_price || 0;
    const misc = sellPrice - total;
    updateQuote({
      material_cost: value,
      base_cost: newBaseCost,
      misc,
    });
  }, [quote, updateQuote]);

  // Set labor cost - recomputes base_cost (= material + labor) and cascades
  // through the same markup/misc math as setBaseCost so the sell price is preserved.
  const setLaborCost = useCallback((value: number) => {
    if (!quote) return;
    const material = quote.material_cost ?? 0;
    const newBaseCost = material + value;
    const markedUpPrice = newBaseCost > 0 ? newBaseCost / 0.67 : 0;
    const total = Math.ceil(markedUpPrice / 10) * 10;
    const sellPrice = quote.quote_price || 0;
    const misc = sellPrice - total;
    updateQuote({
      labor_cost: value,
      base_cost: newBaseCost,
      misc,
    });
  }, [quote, updateQuote]);

  // Toggle deposit requirement
  const toggleDeposit = useCallback((requiresDeposit: boolean) => {
    if (!quote) return;

    updateQuote({
      requires_deposit: requiresDeposit,
    });
  }, [quote, updateQuote]);

  // Refetch quote from database
  const refetch = useCallback(async () => {
    if (!id) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('repair_quotes')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      setQuote(data);
    } catch (err) {
      console.error('Error refetching quote:', err);
    }
  }, [id]);

  // Mark quote as sent (called when Slack message is sent)
  const markAsSent = useCallback(async () => {
    if (!id || !quote) return;

    // Only update if currently in draft or quote_scheduled status
    if (quote.status !== 'draft' && quote.status !== 'quote_scheduled') return;

    try {
      const { error: updateError } = await supabase
        .from('repair_quotes')
        .update({
          status: 'awaiting_signature',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Update local state
      setQuote(prev => {
        if (!prev) return null;
        return { ...prev, status: 'awaiting_signature' };
      });
    } catch (err) {
      console.error('Error marking quote as sent:', err);
    }
  }, [id, quote]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        // Save any pending changes
        if (pendingChangesRef.current && id) {
          saveToDatabase(pendingChangesRef.current);
        }
      }
    };
  }, [id, saveToDatabase]);

  return {
    quote,
    loading,
    error,
    saveStatus,
    updateField,
    updateQuote,
    setBaseCost,
    setSellPrice,
    setMaterialCost,
    setLaborCost,
    toggleDeposit,
    markAsSent,
    refetch,
  };
}
