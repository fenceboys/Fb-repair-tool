'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import type { Customer, CustomerInsert, CustomerWithCounts } from '@/types/customer';
import { normalizePhone } from '@/lib/phoneUtils';
import { normalizeAddress, addressesMatch } from '@/lib/addressUtils';

export interface DedupMatch {
  customer: Customer;
  reason: 'phone' | 'address';
}

export function useCustomers() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [customers, setCustomers] = useState<CustomerWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('customers')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (searchQuery.trim()) {
        const q = searchQuery.trim();
        query = query.or(
          `name.ilike.%${q}%,phone.ilike.%${q}%,address.ilike.%${q}%,email.ilike.%${q}%`
        );
      }

      const { data: rows, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      // Attach per-customer quote lists (non-deleted only) in one round trip.
      const ids = (rows ?? []).map((c) => c.id);
      const quotesByCustomer: Record<string, CustomerWithCounts['quotes']> = {};
      const lastActivity: Record<string, string | null> = {};
      if (ids.length > 0) {
        const { data: quoteRows } = await supabase
          .from('repair_quotes')
          .select('id, customer_id, title, status, quote_price, repair_description, created_at, updated_at, quote_appointment_date, scheduled_date')
          .in('customer_id', ids)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });
        for (const q of quoteRows ?? []) {
          const cid = q.customer_id as string | null;
          if (!cid) continue;
          if (!quotesByCustomer[cid]) quotesByCustomer[cid] = [];
          quotesByCustomer[cid]!.push({
            id: q.id as string,
            title: (q.title as string | null) ?? null,
            status: q.status as string,
            quote_price: (q.quote_price as number) ?? 0,
            repair_description: (q.repair_description as string | null) ?? null,
            created_at: q.created_at as string,
            quote_appointment_date: (q.quote_appointment_date as string | null) ?? null,
            scheduled_date: (q.scheduled_date as string | null) ?? null,
          });
          if (!lastActivity[cid] || (q.updated_at && q.updated_at > lastActivity[cid]!)) {
            lastActivity[cid] = q.updated_at as string | null;
          }
        }
      }

      const decorated = (rows ?? []).map((c) => ({
        ...c,
        quotes: quotesByCustomer[c.id] ?? [],
        quote_count: quotesByCustomer[c.id]?.length ?? 0,
        last_activity: lastActivity[c.id] ?? null,
      }));
      // Sort by the date the customer list shows on each row: most recent
      // quote activity first, fall back to the customer's own updated_at.
      decorated.sort((a, b) => {
        const ak = a.last_activity || a.updated_at;
        const bk = b.last_activity || b.updated_at;
        return (bk || '').localeCompare(ak || '');
      });
      setCustomers(decorated);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, supabase]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Run before insert to surface possible duplicates. Checks normalized phone
  // exact match + fuzzy address (Levenshtein). Returns first hit, or null.
  const findPossibleDuplicate = useCallback(
    async (input: Pick<CustomerInsert, 'phone' | 'address'>): Promise<DedupMatch | null> => {
      const phone = normalizePhone(input.phone);
      const { data: rows } = await supabase
        .from('customers')
        .select('*')
        .is('deleted_at', null);
      if (!rows || rows.length === 0) return null;

      if (phone) {
        const phoneHit = rows.find((c) => normalizePhone(c.phone) === phone);
        if (phoneHit) return { customer: phoneHit as Customer, reason: 'phone' };
      }

      if (input.address && normalizeAddress(input.address)) {
        const addrHit = rows.find((c) => addressesMatch(c.address, input.address));
        if (addrHit) return { customer: addrHit as Customer, reason: 'address' };
      }

      return null;
    },
    [supabase]
  );

  const createCustomer = async (input: CustomerInsert): Promise<Customer | null> => {
    try {
      const payload: CustomerInsert = {
        ...input,
        phone: normalizePhone(input.phone),
        deleted_at: null,
      };
      const { data, error: createError } = await supabase
        .from('customers')
        .insert(payload)
        .select()
        .single();
      if (createError) throw createError;
      await fetchCustomers();
      return data as Customer;
    } catch (err) {
      console.error('Error creating customer:', err);
      setError('Failed to create customer');
      return null;
    }
  };

  const softDeleteCustomer = async (id: string): Promise<boolean> => {
    try {
      const { error: delErr } = await supabase
        .from('customers')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (delErr) throw delErr;
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting customer:', err);
      setError('Failed to delete customer');
      return false;
    }
  };

  return {
    customers,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    findPossibleDuplicate,
    createCustomer,
    softDeleteCustomer,
    refresh: fetchCustomers,
  };
}
