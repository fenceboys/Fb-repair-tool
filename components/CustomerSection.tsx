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
              onChange={(e) => {
                // Strip all non-digits
                const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                // Format as (XXX) XXX-XXXX
                let formatted = '';
                if (digits.length > 0) {
                  formatted = '(' + digits.slice(0, 3);
                }
                if (digits.length >= 3) {
                  formatted += ') ' + digits.slice(3, 6);
                }
                if (digits.length >= 6) {
                  formatted += '-' + digits.slice(6, 10);
                }
                onFieldChange('phone', formatted);
              }}
              placeholder="(555) 123-4567"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
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
              City/Town <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={(quote.city_state || '').replace(/, ?OH$/i, '')}
                onChange={(e) => {
                  const city = e.target.value;
                  onFieldChange('city_state', city ? `${city}, OH` : '');
                }}
                placeholder="Columbus"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              />
              <span className="text-gray-500 font-medium">OH</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Zip <span className="text-red-500">*</span>
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
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Repair Description <span className="text-red-500">*</span>
            </label>
            <span className={`text-xs ${(quote.repair_description?.length || 0) > 850 ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
              {quote.repair_description?.length || 0}/850
            </span>
          </div>
          <textarea
            value={quote.repair_description || ''}
            onChange={(e) => {
              if (e.target.value.length <= 850) {
                onFieldChange('repair_description', e.target.value);
              }
            }}
            placeholder="Describe the repair work to be done..."
            rows={8}
            maxLength={850}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base resize-none"
          />
        </div>
      </div>
    </section>
  );
}
