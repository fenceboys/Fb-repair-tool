'use client';

import type { RepairQuote } from '@/types/quote';

interface CustomerSectionProps {
  quote: RepairQuote;
  onFieldChange: <K extends keyof RepairQuote>(field: K, value: RepairQuote[K]) => void;
}

export function CustomerSection({ quote, onFieldChange }: CustomerSectionProps) {
  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>

      <div className="space-y-4">
        {/* Client Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Client Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={quote.client_name || ''}
            onChange={(e) => onFieldChange('client_name', e.target.value)}
            placeholder="John Smith"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
          />
        </div>

        {/* Phone & Email Row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              inputMode="tel"
              value={quote.phone || ''}
              onChange={(e) => onFieldChange('phone', e.target.value)}
              placeholder="(555) 123-4567"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              inputMode="email"
              value={quote.email || ''}
              onChange={(e) => onFieldChange('email', e.target.value)}
              placeholder="john@email.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
            />
          </div>
        </div>

        {/* Property Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Property Address <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={quote.address || ''}
            onChange={(e) => onFieldChange('address', e.target.value)}
            placeholder="123 Main Street"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
          />
        </div>

        {/* City/State & Zip Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City, State
            </label>
            <input
              type="text"
              value={quote.city_state || ''}
              onChange={(e) => onFieldChange('city_state', e.target.value)}
              placeholder="Austin, TX"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Zip
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={quote.zip || ''}
              onChange={(e) => onFieldChange('zip', e.target.value)}
              placeholder="78701"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
            />
          </div>
        </div>

        {/* Repair Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Repair Description
          </label>
          <textarea
            value={quote.repair_description || ''}
            onChange={(e) => onFieldChange('repair_description', e.target.value)}
            placeholder="Describe the repair work to be done..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base resize-none"
          />
        </div>
      </div>
    </section>
  );
}
