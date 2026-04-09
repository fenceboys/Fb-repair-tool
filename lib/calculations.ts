import type { LineItem } from '@/types/quote';

export function calculateTotal(lineItems: LineItem[]) {
  // Base cost is sum of all line item costs (raw material/labor cost)
  const baseCost = lineItems.reduce((sum, item) => sum + (item.cost || 0), 0);

  // Apply 33% margin (cost / 0.67), rounded up to nearest $10
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

export function generateSignatureDataUrl(name: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';
    ctx.font = 'italic 36px "Brush Script MT", cursive, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, canvas.width / 2, canvas.height / 2);
  }

  return canvas.toDataURL('image/png');
}
