'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CustomerInsert } from '@/types/customer';
import { useCustomers, type DedupMatch } from '@/hooks/useCustomers';
import { formatPhoneDisplay, formatPhoneInput } from '@/lib/phoneUtils';

interface NewCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (customerId: string) => void;
}

const EMPTY: CustomerInsert = {
  deleted_at: null,
  name: '',
  phone: '',
  email: '',
  address: '',
  city_state: '',
  zip: '',
  notes: '',
  quote_appointment_date: null,
};

export function NewCustomerModal({ isOpen, onClose, onCreated }: NewCustomerModalProps) {
  const router = useRouter();
  const { findPossibleDuplicate, createCustomer } = useCustomers();
  const [form, setForm] = useState<CustomerInsert>(EMPTY);
  const [dedup, setDedup] = useState<DedupMatch | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const field = <K extends keyof CustomerInsert>(key: K, value: CustomerInsert[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const reset = () => {
    setForm(EMPTY);
    setDedup(null);
    setError(null);
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (opts?: { ignoreDedup?: boolean }) => {
    setError(null);
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    setSubmitting(true);
    try {
      if (!opts?.ignoreDedup) {
        const match = await findPossibleDuplicate({ phone: form.phone, address: form.address });
        if (match) {
          setDedup(match);
          setSubmitting(false);
          return;
        }
      }

      const created = await createCustomer(form);
      if (!created) {
        setError('Failed to save customer');
        setSubmitting(false);
        return;
      }
      reset();
      onClose();
      if (onCreated) onCreated(created.id);
      else router.push(`/customers/${created.id}`);
    } catch (err) {
      console.error(err);
      setError('Failed to save customer');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-xl font-semibold text-gray-900">New Customer</h2>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {dedup && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-amber-900">Possible duplicate</p>
                <p className="text-sm text-amber-800 mt-1">
                  A customer already exists{' '}
                  {dedup.reason === 'phone' ? 'with that phone number' : 'at a similar address'}:
                </p>
                <p className="text-sm text-amber-900 mt-2 font-medium">
                  {dedup.customer.name}
                  {dedup.customer.phone ? ` — ${formatPhoneDisplay(dedup.customer.phone)}` : ''}
                  {dedup.customer.address ? ` — ${dedup.customer.address}` : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    router.push(`/customers/${dedup.customer.id}`);
                  }}
                  className="flex-1 px-3 py-2 bg-amber-600 text-white text-sm font-medium rounded hover:bg-amber-700"
                >
                  Use existing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDedup(null);
                    handleSubmit({ ignoreDedup: true });
                  }}
                  className="flex-1 px-3 py-2 bg-white border border-amber-300 text-amber-900 text-sm font-medium rounded hover:bg-amber-100"
                >
                  Create anyway
                </button>
              </div>
            </div>
          )}

          <Field label="Name" required>
            <input
              type="text"
              value={form.name}
              onChange={(e) => field('name', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Full name"
              autoFocus
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone">
              <input
                type="tel"
                inputMode="tel"
                value={form.phone ?? ''}
                onChange={(e) => field('phone', formatPhoneInput(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="(216) 555-1234"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={form.email ?? ''}
                onChange={(e) => field('email', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="name@example.com"
              />
            </Field>
          </div>

          <Field label="Address">
            <input
              type="text"
              value={form.address ?? ''}
              onChange={(e) => field('address', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="123 Oak Street"
            />
          </Field>

          <div className="grid grid-cols-[2fr_1fr] gap-3">
            <Field label="City, State">
              <input
                type="text"
                value={form.city_state ?? ''}
                onChange={(e) => field('city_state', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Columbus, OH"
              />
            </Field>
            <Field label="ZIP">
              <input
                type="text"
                inputMode="numeric"
                value={form.zip ?? ''}
                onChange={(e) => field('zip', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="43201"
              />
            </Field>
          </div>

          <Field label="Customer Notes (optional)">
            <textarea
              value={form.notes ?? ''}
              onChange={(e) => field('notes', e.target.value)}
              rows={2}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
              placeholder="Gate on side of house. Dog in yard."
            />
          </Field>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex gap-3 sticky bottom-0 bg-white">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={submitting || !form.name.trim()}
            className="flex-1 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving…' : 'Save Customer'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
