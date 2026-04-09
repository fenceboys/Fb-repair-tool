'use client';

import type { RepairQuote } from '@/types/quote';
import { formatCurrency } from '@/lib/calculations';

interface PricingSectionProps {
  quote: RepairQuote;
  onSetBaseCost: (cost: number) => void;
  onSetSellPrice: (price: number) => void;
  onToggleDeposit: (requiresDeposit: boolean) => void;
}

export function PricingSection({
  quote,
  onSetBaseCost,
  onSetSellPrice,
  onToggleDeposit,
}: PricingSectionProps) {
  // Calculate total with 33% margin: cost / 0.67, rounded up to nearest $10
  const baseCost = quote.base_cost || 0;
  const markedUpPrice = baseCost > 0 ? baseCost / 0.67 : 0;
  const total = Math.ceil(markedUpPrice / 10) * 10;

  // Misc is the difference between sell price and calculated total
  const misc = (quote.quote_price || 0) - total;

  const requiresDeposit = quote.requires_deposit ?? false;
  const amountDue = requiresDeposit ? quote.deposit : quote.quote_price;

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h2>

      <div className="space-y-4">
        {/* Base Cost Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Your Cost
          </label>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-lg">$</span>
            <input
              type="number"
              inputMode="decimal"
              value={baseCost || ''}
              onChange={(e) => onSetBaseCost(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xl font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        </div>

        {/* Total with 33% margin (auto-calculated) */}
        <div className="flex justify-between items-center py-3 px-4 bg-blue-50 rounded-lg">
          <span className="font-semibold text-blue-900">Total (w/ 33%):</span>
          <span className="text-2xl font-bold text-blue-900">{formatCurrency(total)}</span>
        </div>

        {/* Sell Price (editable) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sell Price
          </label>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-lg">$</span>
            <input
              type="number"
              inputMode="decimal"
              value={quote.quote_price || ''}
              onChange={(e) => onSetSellPrice(parseFloat(e.target.value) || 0)}
              placeholder={total > 0 ? total.toString() : '0'}
              className="flex-1 px-4 py-3 border-2 border-green-500 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-xl font-bold bg-green-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        </div>

        {/* Miscellaneous (auto-calculated difference) */}
        {quote.quote_price > 0 && (
          <div className="flex justify-between items-center py-2 px-4 bg-gray-100 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Miscellaneous:</span>
            <span className={`font-semibold ${misc >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {misc >= 0 ? '+' : ''}{formatCurrency(misc)}
            </span>
          </div>
        )}

        {/* Deposit Toggle */}
        <div className="pt-3 border-t border-gray-200">
          <button
            onClick={() => onToggleDeposit(!requiresDeposit)}
            className={`w-full flex items-center justify-between py-3 px-4 rounded-lg transition-colors ${
              requiresDeposit
                ? 'bg-amber-50 border-2 border-amber-400'
                : 'bg-gray-50 border border-gray-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-6 rounded-full transition-colors relative ${
                  requiresDeposit ? 'bg-amber-500' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    requiresDeposit ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </div>
              <span className="font-medium text-gray-700">
                {requiresDeposit ? '50% Deposit' : 'Toggle for 50% Deposit'}
              </span>
            </div>
            <span className="text-xl font-bold text-gray-900">
              {formatCurrency(amountDue || 0)}
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
