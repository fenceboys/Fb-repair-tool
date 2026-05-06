'use client';

import { useEffect, useState } from 'react';
import type { Customer, CustomerUpdate } from '@/types/customer';
import { formatPhoneInput } from '@/lib/phoneUtils';

interface CustomerEditModalProps {
  isOpen: boolean;
  customer: Customer | null;
  onClose: () => void;
  onSave: (updates: CustomerUpdate) => Promise<boolean>;
}

export function CustomerEditModal({ isOpen, customer, onClose, onSave }: CustomerEditModalProps) {
  const [form, setForm] = useState<CustomerUpdate>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name,
        phone: customer.phone ? formatPhoneInput(customer.phone) : customer.phone,
        email: customer.email,
        address: customer.address,
        city_state: customer.city_state,
        zip: customer.zip,
        notes: customer.notes,
      });
    }
  }, [customer]);

  if (!isOpen || !customer) return null;

  const field = <K extends keyof CustomerUpdate>(key: K, value: CustomerUpdate[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setError(null);
    if (!form.name || !form.name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    const ok = await onSave(form);
    setSaving(false);
    if (ok) {
      onClose();
    } else {
      setError('Failed to save');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-xl font-semibold text-gray-900">Edit Customer</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={form.name ?? ''}
              onChange={(e) => field('name', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                inputMode="tel"
                value={form.phone ?? ''}
                onChange={(e) => field('phone', formatPhoneInput(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email ?? ''}
                onChange={(e) => field('email', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              value={form.address ?? ''}
              onChange={(e) => field('address', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-[2fr_1fr] gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City, State</label>
              <input
                type="text"
                value={form.city_state ?? ''}
                onChange={(e) => field('city_state', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
              <input
                type="text"
                inputMode="numeric"
                value={form.zip ?? ''}
                onChange={(e) => field('zip', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Notes</label>
            <textarea
              value={form.notes ?? ''}
              onChange={(e) => field('notes', e.target.value)}
              rows={2}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex gap-3 sticky bottom-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !form.name?.trim()}
            className="flex-1 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
