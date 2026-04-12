import type { RepairQuote } from '@/types/quote';
import { generatePDFBlob, generateFilename } from './pdf';

type QuoteStatus = 'quote_scheduled' | 'draft' | 'awaiting_signature' | 'awaiting_payment' | 'paid' | 'repair_scheduled';

const statusLabels: Record<QuoteStatus, string> = {
  quote_scheduled: 'Quote Scheduled',
  draft: 'Draft',
  awaiting_signature: 'Awaiting Signature',
  awaiting_payment: 'Awaiting Payment',
  paid: 'Paid',
  repair_scheduled: 'Repair Scheduled',
};

interface SlackStatusPayload {
  quote: {
    id: string;
    client_name: string | null;
    phone: string | null;
    email?: string | null;
    address: string | null;
    city_state?: string | null;
    quote_price?: number;
    base_cost?: number;
    deposit?: number;
    requires_deposit?: boolean;
    repair_description?: string | null;
    status: QuoteStatus;
    scheduled_date?: string | null;
    quote_appointment_date?: string | null;
  };
  pdfBase64?: string;
  filename?: string;
  customMessage?: string;
  basicInfoOnly?: boolean;
}

/**
 * Send a Slack notification for a status change.
 * This is the main function to call when any status changes.
 */
export async function sendStatusChangeNotification(
  quote: Partial<RepairQuote> & { id: string; client_name: string | null; phone: string | null; address: string | null; status: QuoteStatus },
  newStatus: QuoteStatus,
  options?: {
    includePdf?: boolean;
    customMessage?: string;
    scheduledDate?: string | null;
  }
): Promise<boolean> {
  try {
    const statusMessage = getStatusMessage(newStatus, quote.client_name, options?.scheduledDate);

    // Build the payload
    const payload: SlackStatusPayload = {
      quote: {
        id: quote.id,
        client_name: quote.client_name,
        phone: quote.phone,
        email: quote.email,
        address: quote.address,
        city_state: quote.city_state,
        quote_price: quote.quote_price,
        base_cost: quote.base_cost,
        deposit: quote.deposit,
        requires_deposit: quote.requires_deposit,
        repair_description: quote.repair_description,
        status: newStatus,
        scheduled_date: options?.scheduledDate || quote.scheduled_date,
        quote_appointment_date: quote.quote_appointment_date,
      },
      customMessage: options?.customMessage || statusMessage,
      basicInfoOnly: !options?.includePdf,
    };

    // Include PDF for certain statuses
    if (options?.includePdf && typeof window !== 'undefined') {
      try {
        const pdfBlob = await generatePDFBlob(quote as RepairQuote);
        const filename = generateFilename(quote as RepairQuote);
        const arrayBuffer = await pdfBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < uint8Array.length; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        payload.pdfBase64 = btoa(binary);
        payload.filename = filename;
        payload.basicInfoOnly = false;
      } catch (pdfError) {
        console.error('Failed to generate PDF for Slack:', pdfError);
        // Continue without PDF
      }
    }

    const response = await fetch('/api/slack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Slack notification failed:', errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending Slack notification:', error);
    return false;
  }
}

/**
 * Get a human-readable message for a status change
 */
function getStatusMessage(status: QuoteStatus, clientName: string | null, scheduledDate?: string | null): string {
  const name = clientName || 'Customer';

  switch (status) {
    case 'quote_scheduled':
      if (scheduledDate) {
        const date = new Date(scheduledDate);
        const formatted = date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        });
        return `Quote appointment scheduled for ${formatted}`;
      }
      return 'Quote appointment scheduled';

    case 'awaiting_signature':
      return 'Proposal sent to customer';

    case 'awaiting_payment':
      return `${name} signed the contract - awaiting payment`;

    case 'paid':
      return `${name} paid! Ready to schedule repair`;

    case 'repair_scheduled':
      if (scheduledDate) {
        const date = new Date(scheduledDate);
        const formatted = date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        });
        return `Repair scheduled for ${formatted}`;
      }
      return 'Repair scheduled';

    case 'draft':
      return 'Quote created';

    default:
      return `Status changed to ${statusLabels[status] || status}`;
  }
}

/**
 * Convenience function for quote scheduled notification
 */
export async function notifyQuoteScheduled(
  quote: Partial<RepairQuote> & { id: string; client_name: string | null; phone: string | null; address: string | null },
  appointmentDate: string
): Promise<boolean> {
  return sendStatusChangeNotification(
    { ...quote, status: 'quote_scheduled', quote_appointment_date: appointmentDate },
    'quote_scheduled',
    { scheduledDate: appointmentDate }
  );
}

/**
 * Convenience function for customer signed notification
 */
export async function notifyCustomerSigned(
  quote: Partial<RepairQuote> & { id: string; client_name: string | null; phone: string | null; address: string | null }
): Promise<boolean> {
  return sendStatusChangeNotification(
    { ...quote, status: 'awaiting_payment' },
    'awaiting_payment'
  );
}

/**
 * Convenience function for payment received notification
 */
export async function notifyPaymentReceived(
  quote: Partial<RepairQuote> & { id: string; client_name: string | null; phone: string | null; address: string | null }
): Promise<boolean> {
  return sendStatusChangeNotification(
    { ...quote, status: 'paid' },
    'paid'
  );
}

/**
 * Convenience function for repair scheduled notification
 */
export async function notifyRepairScheduled(
  quote: Partial<RepairQuote> & { id: string; client_name: string | null; phone: string | null; address: string | null },
  repairDate: string
): Promise<boolean> {
  return sendStatusChangeNotification(
    { ...quote, status: 'repair_scheduled', scheduled_date: repairDate },
    'repair_scheduled',
    { scheduledDate: repairDate }
  );
}
