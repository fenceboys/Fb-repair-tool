import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { PDFPage, PDFFont } from 'pdf-lib';
import type { RepairQuote } from '@/types/quote';
import {
  FIELD_POSITIONS,
  REPAIR_DESCRIPTION_BOUNDS,
  SIGNATURE_SIZE,
} from './fieldPositions';
import { formatCurrency, generateSignatureDataUrl } from './calculations';

// Draw text with word wrapping
function drawWrappedText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  width: number,
  font: PDFFont,
  fontSize: number,
  lineHeight: number,
  maxLines: number = 10
): void {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return;
  }

  const cleanText = text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  const words = cleanText.split(' ').filter(w => w.length > 0);
  if (words.length === 0) return;

  let currentLine = '';
  let currentY = y;
  let lineCount = 0;

  for (const word of words) {
    if (lineCount >= maxLines) break;

    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (testWidth > width && currentLine) {
      page.drawText(currentLine, {
        x,
        y: currentY,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
      currentLine = word;
      currentY -= lineHeight;
      lineCount++;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine && lineCount < maxLines) {
    page.drawText(currentLine, {
      x,
      y: currentY,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });
  }
}

export async function generatePDF(quote: RepairQuote): Promise<Uint8Array> {
  // Load the blank repair contract PDF
  const response = await fetch('/FB_Repair_Contract_Clean.pdf');
  if (!response.ok) {
    throw new Error(`Failed to load PDF template: ${response.status} ${response.statusText}`);
  }
  const existingPdfBytes = await response.arrayBuffer();
  const pdfDoc = await PDFDocument.load(existingPdfBytes);

  const pages = pdfDoc.getPages();
  const page = pages[0];

  // Embed fonts
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 12;

  // Draw client information using calibrated positions
  const fields: Array<{ key: keyof typeof FIELD_POSITIONS; value: string | null | undefined }> = [
    { key: 'client_name', value: quote.client_name },
    { key: 'phone', value: quote.phone },
    { key: 'email', value: quote.email },
    { key: 'address', value: quote.address },
    { key: 'city_state', value: quote.city_state },
    { key: 'zip', value: quote.zip },
  ];

  for (const { key, value } of fields) {
    if (value) {
      const pos = FIELD_POSITIONS[key];
      page.drawText(value, {
        x: pos.x,
        y: pos.y,
        size: fontSize,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
    }
  }

  // Draw repair description with wrapping
  if (quote.repair_description) {
    drawWrappedText(
      page,
      quote.repair_description,
      REPAIR_DESCRIPTION_BOUNDS.x,
      REPAIR_DESCRIPTION_BOUNDS.y,
      REPAIR_DESCRIPTION_BOUNDS.maxWidth,
      helveticaFont,
      fontSize,
      REPAIR_DESCRIPTION_BOUNDS.lineHeight,
      REPAIR_DESCRIPTION_BOUNDS.maxLines
    );
  }

  // Draw total price (larger font)
  if (quote.quote_price > 0) {
    const pos = FIELD_POSITIONS.total_price;
    page.drawText(formatCurrency(quote.quote_price), {
      x: pos.x,
      y: pos.y,
      size: 16,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
  }

  // Draw amount due (deposit or full payment)
  const amountDue = quote.requires_deposit ? quote.deposit : quote.quote_price;
  if (amountDue > 0) {
    const pos = FIELD_POSITIONS.deposit;
    page.drawText(formatCurrency(amountDue), {
      x: pos.x,
      y: pos.y,
      size: 16,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
  }

  // Draw issue date
  const today = new Date().toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });

  const issueDatePos = FIELD_POSITIONS.issue_date;
  page.drawText(today, {
    x: issueDatePos.x,
    y: issueDatePos.y,
    size: fontSize,
    font: helveticaFont,
    color: rgb(0, 0, 0),
  });

  // Also draw date next to client signature
  const datePos = FIELD_POSITIONS.date;
  page.drawText(today, {
    x: datePos.x,
    y: datePos.y,
    size: fontSize,
    font: helveticaFont,
    color: rgb(0, 0, 0),
  });

  // Draw client signature if present
  if (quote.client_signature) {
    try {
      const sigData = quote.client_signature.split(',')[1];
      const sigBytes = Uint8Array.from(atob(sigData), c => c.charCodeAt(0));
      const sigImage = await pdfDoc.embedPng(sigBytes);

      const scale = Math.min(
        SIGNATURE_SIZE.width / sigImage.width,
        SIGNATURE_SIZE.height / sigImage.height
      );

      const pos = FIELD_POSITIONS.client_signature;
      page.drawImage(sigImage, {
        x: pos.x,
        y: pos.y,
        width: sigImage.width * scale,
        height: sigImage.height * scale,
      });
    } catch (error) {
      console.error('Failed to embed client signature:', error);
    }
  }

  // Always draw salesperson signature (Colt Stonerook)
  try {
    // Use existing signature or generate one for Colt Stonerook
    const salespersonSig = quote.salesperson_signature || generateSignatureDataUrl('Colt Stonerook');
    const sigData = salespersonSig.split(',')[1];
    const sigBytes = Uint8Array.from(atob(sigData), c => c.charCodeAt(0));
    const sigImage = await pdfDoc.embedPng(sigBytes);

    const scale = Math.min(
      SIGNATURE_SIZE.width / sigImage.width,
      SIGNATURE_SIZE.height / sigImage.height
    );

    const pos = FIELD_POSITIONS.salesperson_signature;
    page.drawImage(sigImage, {
      x: pos.x,
      y: pos.y,
      width: sigImage.width * scale,
      height: sigImage.height * scale,
    });
  } catch (error) {
    console.error('Failed to embed salesperson signature:', error);
  }

  return pdfDoc.save();
}

export function downloadPDF(pdfBytes: Uint8Array, filename: string): void {
  const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateFilename(quote: RepairQuote): string {
  const date = new Date().toISOString().split('T')[0];
  const name = quote.client_name?.trim().replace(/[<>:"/\\|?*]/g, '-') || 'Repair';
  return `FB Repair - ${name} - ${date}.pdf`;
}

export async function generateAndDownloadPDF(quote: RepairQuote): Promise<void> {
  const pdfBytes = await generatePDF(quote);
  const filename = generateFilename(quote);
  downloadPDF(pdfBytes, filename);
}

export async function generatePDFBlob(quote: RepairQuote): Promise<Blob> {
  const pdfBytes = await generatePDF(quote);
  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
}
