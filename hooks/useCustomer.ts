'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import type { Customer, CustomerUpdate } from '@/types/customer';
import type { RepairQuote } from '@/types/quote';
import { generateSignatureDataUrl } from '@/lib/calculations';
import { formatPhoneDisplay, normalizePhone } from '@/lib/phoneUtils';

export function useCustomer(id: string | null) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [quotes, setQuotes] = useState<RepairQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data: cust, error: cErr } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();
      if (cErr) throw cErr;
      setCustomer(cust as Customer);

      const { data: qs, error: qErr } = await supabase
        .from('repair_quotes')
        .select('*')
        .eq('customer_id', id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (qErr) throw qErr;
      setQuotes((qs ?? []) as RepairQuote[]);
    } catch (err) {
      console.error('Error loading customer:', err);
      setError('Failed to load customer');
    } finally {
      setLoading(false);
    }
  }, [id, supabase]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const updateCustomer = async (updates: CustomerUpdate): Promise<boolean> => {
    if (!id) return false;
    try {
      const payload: CustomerUpdate = {
        ...updates,
        phone: updates.phone !== undefined ? normalizePhone(updates.phone) : undefined,
      };
      const { error: uErr } = await supabase
        .from('customers')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (uErr) throw uErr;
      setCustomer((prev) => (prev ? ({ ...prev, ...payload } as Customer) : prev));
      return true;
    } catch (err) {
      console.error('Error updating customer:', err);
      return false;
    }
  };

  const buildInternalNotesHeader = (c: Customer): string => {
    if (c.notes?.trim()) return c.notes.trim();
    const parts: string[] = [];
    if (c.address) parts.push(`Address: ${c.address}${c.city_state ? `, ${c.city_state}` : ''}`);
    const phoneDisplay = formatPhoneDisplay(c.phone);
    if (phoneDisplay) parts.push(`Phone: ${phoneDisplay}`);
    if (c.email) parts.push(`Email: ${c.email}`);
    return parts.join(' · ');
  };

  const createQuoteForCustomer = async (): Promise<string | null> => {
    if (!customer) return null;
    try {
      const salespersonSignature = generateSignatureDataUrl('Colt Stonerook');
      const { data, error: cErr } = await supabase
        .from('repair_quotes')
        .insert({
          customer_id: customer.id,
          // Default title: "<Name> Repair Quote" so the project list never
          // falls back to repair_description. Colt can override freely.
          title: customer.name?.trim() ? `${customer.name.trim()} Repair Quote` : null,
          client_name: customer.name ?? '',
          phone: formatPhoneDisplay(customer.phone) || customer.phone || '',
          email: customer.email ?? '',
          address: customer.address ?? '',
          city_state: customer.city_state ?? '',
          zip: customer.zip ?? '',
          repair_description: '',
          line_items: [],
          base_cost: 0,
          quote_price: 0,
          misc: 0,
          deposit: 0,
          status: 'scheduling_quote',
          internal_notes: buildInternalNotesHeader(customer),
          salesperson_signature: salespersonSignature,
        })
        .select()
        .single();
      if (cErr) throw cErr;
      // Intentionally skip the refetch — caller routes straight to the editor,
      // so refreshing the list here just causes a flash of the new pill.
      return data?.id ?? null;
    } catch (err) {
      console.error('Error creating quote for customer:', err);
      return null;
    }
  };

  const duplicateQuote = async (sourceId: string): Promise<string | null> => {
    if (!customer) return null;
    try {
      const src = quotes.find((q) => q.id === sourceId);
      if (!src) return null;
      const salespersonSignature = generateSignatureDataUrl('Colt Stonerook');
      const { data, error: dErr } = await supabase
        .from('repair_quotes')
        .insert({
          customer_id: customer.id,
          title: src.title ? `${src.title} (copy)` : null,
          client_name: src.client_name,
          phone: src.phone,
          email: src.email,
          address: src.address,
          city_state: src.city_state,
          zip: src.zip,
          repair_description: src.repair_description,
          line_items: src.line_items ?? [],
          base_cost: src.base_cost,
          quote_price: src.quote_price,
          misc: src.misc,
          deposit: src.deposit,
          requires_deposit: src.requires_deposit,
          material_cost: src.material_cost,
          labor_cost: src.labor_cost,
          materials_notes: src.materials_notes,
          internal_notes: src.internal_notes,
          // Reset for a fresh quote lifecycle
          status: 'draft',
          pdf_url: null,
          signed_copy_url: null,
          client_signature: null,
          salesperson_signature: salespersonSignature,
          notes: [],
          scheduled_date: null,
          quote_appointment_date: null,
          revision_count: 0,
          revised_at: null,
          portal_closed: false,
          payment_client_secret: null,
        })
        .select()
        .single();
      if (dErr) throw dErr;
      // Skip refetch — caller navigates to the new quote's editor.
      return data?.id ?? null;
    } catch (err) {
      console.error('Error duplicating quote:', err);
      return null;
    }
  };

  const softDeleteQuote = async (quoteId: string): Promise<boolean> => {
    try {
      const { error: dErr } = await supabase
        .from('repair_quotes')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', quoteId);
      if (dErr) throw dErr;
      await fetchAll();
      return true;
    } catch (err) {
      console.error('Error deleting quote:', err);
      return false;
    }
  };

  const softDeleteCustomer = async (): Promise<boolean> => {
    if (!id) return false;
    try {
      const { error: dErr } = await supabase
        .from('customers')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (dErr) throw dErr;
      return true;
    } catch (err) {
      console.error('Error deleting customer:', err);
      return false;
    }
  };

  return {
    customer,
    quotes,
    loading,
    error,
    updateCustomer,
    createQuoteForCustomer,
    duplicateQuote,
    softDeleteQuote,
    softDeleteCustomer,
    refetch: fetchAll,
  };
}
