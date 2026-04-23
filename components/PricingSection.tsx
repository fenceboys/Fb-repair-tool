'use client';

import { useState } from 'react';
import type { RepairQuote } from '@/types/quote';
import { formatCurrency } from '@/lib/calculations';

interface PricingSectionProps {
  quote: RepairQuote;
  onSetMaterialCost: (cost: number) => void;
  onSetLaborCost: (cost: number) => void;
  onSetSellPrice: (price: number) => void;
  onToggleDeposit: (requiresDeposit: boolean) => void;
  onMaterialsNotesChange: (notes: string) => void;
  onLegacySplit: (material: number, labor: number) => void;
}

export function PricingSection({
  quote,
  onSetMaterialCost,
  onSetLaborCost,
  onSetSellPrice,
  onToggleDeposit,
  onMaterialsNotesChange,
  onLegacySplit,
}: PricingSectionProps) {
  // Lock editing when awaiting signature or later
  const isLocked =
    quote.status === 'awaiting_signature' ||
    quote.status === 'awaiting_payment' ||
    quote.status === 'paid' ||
    quote.status === 'repair_scheduled';

  // Legacy detection: quote predates the material/labor split, base_cost is set
  // but the two new fields are null. Don't blindly render $0/$0 inputs — that
  // would overwrite base_cost on first edit. Show an explicit "split this" flow.
  const isLegacyUnsplit =
    quote.material_cost === null &&
    quote.labor_cost === null &&
    (quote.base_cost || 0) > 0;

  // Calculate minimum price with 25% margin (cost / 0.75)
  const baseCost = quote.base_cost || 0;
  const minPrice = baseCost > 0 ? Math.round((baseCost / 0.75) * 100) / 100 : 0;

  // Misc is the difference between sell price and minimum price
  const misc = (quote.quote_price || 0) - minPrice;

  const requiresDeposit = quote.requires_deposit ?? false;
  const amountDue = requiresDeposit ? quote.deposit : quote.quote_price;

  // Payout breakdown calculations (75% Colt, 25% FB Margin)
  const sellPrice = quote.quote_price || 0;
  const coltPayout = sellPrice * 0.75;
  const fbMargin = sellPrice * 0.25;

  // Values shown in the two cost inputs for non-legacy quotes.
  const materialValue = quote.material_cost ?? 0;
  const laborValue = quote.labor_cost ?? 0;
  const totalCost = materialValue + laborValue;

  // Local state for the legacy "split this" form
  const [legacyMaterial, setLegacyMaterial] = useState<number>(0);
  const [legacyLabor, setLegacyLabor] = useState<number>(baseCost);
  const legacySplitValid =
    Math.round((legacyMaterial + legacyLabor) * 100) ===
    Math.round(baseCost * 100);

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Pricing</h2>
        {isLocked && (
          <div className="flex items-center gap-1 text-amber-600 text-sm font-medium">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <span>Locked</span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {isLegacyUnsplit ? (
          // Legacy quote: render a one-time "Split this cost" form.
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Split this cost into materials + labor
              </p>
              <p className="text-xs text-amber-800 mt-1">
                This quote's {formatCurrency(baseCost)} cost was entered before
                we tracked the split. Enter how much of it was materials vs.
                labor — the total stays the same.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-amber-900 mb-1">
                  Material Cost
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500 text-base">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={legacyMaterial || ''}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0;
                      setLegacyMaterial(v);
                      // Auto-balance labor so the sum stays == baseCost
                      setLegacyLabor(Math.max(0, Math.round((baseCost - v) * 100) / 100));
                    }}
                    onWheel={(e) => e.currentTarget.blur()}
                    disabled={isLocked}
                    className="flex-1 px-3 py-2 border border-amber-300 rounded focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-amber-900 mb-1">
                  Labor Cost
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500 text-base">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={legacyLabor || ''}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0;
                      setLegacyLabor(v);
                      setLegacyMaterial(Math.max(0, Math.round((baseCost - v) * 100) / 100));
                    }}
                    onWheel={(e) => e.currentTarget.blur()}
                    disabled={isLocked}
                    className="flex-1 px-3 py-2 border border-amber-300 rounded focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-amber-800">
                Sum: {formatCurrency(legacyMaterial + legacyLabor)} of{' '}
                {formatCurrency(baseCost)}
              </span>
              <button
                type="button"
                disabled={isLocked || !legacySplitValid}
                onClick={() => onLegacySplit(legacyMaterial, legacyLabor)}
                className="px-3 py-1.5 bg-amber-600 text-white text-sm font-medium rounded hover:bg-amber-700 disabled:bg-amber-300 disabled:cursor-not-allowed"
              >
                Save split
              </button>
            </div>
          </div>
        ) : (
          // Normal UI: Material Cost + Labor Cost inputs, auto-total
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Material Cost <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-gray-500 text-lg">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={materialValue || ''}
                  onChange={(e) =>
                    onSetMaterialCost(parseFloat(e.target.value) || 0)
                  }
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="0.00"
                  disabled={isLocked}
                  className={`flex-1 min-w-0 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xl font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                    isLocked ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
                  }`}
                />
              </div>
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Labor Cost <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-gray-500 text-lg">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={laborValue || ''}
                  onChange={(e) =>
                    onSetLaborCost(parseFloat(e.target.value) || 0)
                  }
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="0.00"
                  disabled={isLocked}
                  className={`flex-1 min-w-0 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xl font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                    isLocked ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
                  }`}
                />
              </div>
            </div>
          </div>
        )}

        {/* Total cost (auto, read-only) */}
        {!isLegacyUnsplit && (
          <div className="flex justify-between items-center py-2 px-4 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">
              Your total cost:
            </span>
            <span className="text-lg font-semibold text-gray-900">
              {formatCurrency(totalCost)}
            </span>
          </div>
        )}

        {/* Materials breakdown notes (internal only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Materials breakdown{' '}
            <span className="text-xs text-gray-500 font-normal">
              (internal only)
            </span>
          </label>
          <textarea
            value={quote.materials_notes ?? ''}
            onChange={(e) => onMaterialsNotesChange(e.target.value)}
            disabled={isLocked}
            placeholder="e.g. 4 posts, 6 4x4s, 1 box screws"
            rows={2}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-y ${
              isLocked ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
            }`}
          />
        </div>

        {/* Minimum price with 25% margin (auto-calculated) */}
        <div className="flex justify-between items-center py-3 px-4 bg-blue-50 rounded-lg">
          <span className="font-semibold text-blue-900">Min (w/ 25%):</span>
          <span className="text-2xl font-bold text-blue-900">
            {formatCurrency(minPrice)}
          </span>
        </div>

        {/* Sell Price (editable) */}
        <div className="min-w-0">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sell Price <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-gray-500 text-lg">$</span>
            <input
              type="number"
              inputMode="decimal"
              value={quote.quote_price || ''}
              onChange={(e) => onSetSellPrice(parseFloat(e.target.value) || 0)}
              onWheel={(e) => e.currentTarget.blur()}
              placeholder=""
              disabled={isLocked}
              className={`flex-1 min-w-0 w-full px-4 py-3 border-2 border-green-500 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-xl font-bold bg-green-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                isLocked ? 'border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed' : ''
              }`}
            />
          </div>
        </div>

        {/* Miscellaneous (auto-calculated difference) */}
        {quote.quote_price > 0 && (
          <div className="flex justify-between items-center py-2 px-4 bg-gray-100 rounded-lg">
            <span className="text-sm font-medium text-gray-700">
              Miscellaneous:
            </span>
            <span
              className={`font-semibold ${
                misc >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {misc >= 0 ? '+' : ''}
              {formatCurrency(misc)}
            </span>
          </div>
        )}

        {/* Payout Breakdown - Only show when sell price is set */}
        {sellPrice > 0 && (
          <div className="mt-4 pt-4 border-t border-dashed border-gray-300">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <svg
                className="w-4 h-4 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              Payout Breakdown
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2 px-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-blue-800">Colt:</span>
                <span className="text-lg font-bold text-blue-900">
                  {formatCurrency(coltPayout)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 px-3 bg-red-50 rounded-lg">
                <span className="text-sm font-medium text-red-800">
                  FB Margin:
                </span>
                <span className="text-lg font-bold text-red-900">
                  {formatCurrency(fbMargin)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Deposit Toggle */}
        <div className="pt-3 border-t border-gray-200">
          <button
            onClick={() => !isLocked && onToggleDeposit(!requiresDeposit)}
            disabled={isLocked}
            className={`w-full flex items-center justify-between py-3 px-4 rounded-lg transition-colors ${
              isLocked
                ? 'bg-gray-100 border border-gray-200 cursor-not-allowed'
                : requiresDeposit
                ? 'bg-amber-50 border-2 border-amber-400'
                : 'bg-gray-50 border border-gray-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-6 rounded-full transition-colors relative ${
                  isLocked
                    ? 'bg-gray-300'
                    : requiresDeposit
                    ? 'bg-amber-500'
                    : 'bg-gray-300'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    requiresDeposit ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </div>
              <span
                className={`font-medium ${
                  isLocked ? 'text-gray-500' : 'text-gray-700'
                }`}
              >
                {requiresDeposit ? '50% Deposit' : 'Toggle for 50% Deposit'}
              </span>
            </div>
            <span
              className={`text-xl font-bold ${
                isLocked ? 'text-gray-500' : 'text-gray-900'
              }`}
            >
              {formatCurrency(amountDue || 0)}
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
