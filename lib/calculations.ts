import type { LineItem } from '@/types/quote';

export function calculateTotal(lineItems: LineItem[]) {
  // Base cost is sum of all line item costs (raw material/labor cost)
  const baseCost = lineItems.reduce((sum, item) => sum + (item.cost || 0), 0);

  // Total with 33% margin markup (divide by 0.67), rounded up to nearest $10
  const markedUpPrice = baseCost > 0 ? baseCost / 0.67 : 0;
  const total = Math.ceil(markedUpPrice / 10) * 10;

  return {
    baseCost: Math.round(baseCost * 100) / 100,
    total,
  };
}

export function calculateMisc(total: number, sellPrice: number): number {
  // Misc is the difference between sell price and calculated total
  return Math.round((sellPrice - total) * 100) / 100;
}

export function calculateDeposit(sellPrice: number): number {
  return Math.round(sellPrice * 0.50 * 100) / 100;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
