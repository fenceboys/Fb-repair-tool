import type { RepairQuote } from '@/types/quote';
import { generatePDFBlob, generateFilename } from './pdf';
import { supabase } from './supabase';
import { replaceMergeTags } from './adminConfig';
import type { NotificationTemplate, StatusConfig } from '@/types/admin';
import { DEFAULT_NOTIFICATION_TEMPLATES, DEFAULT_STATUS_CONFIG } from '@/types/admin';

type QuoteStatus = 'scheduling_quote' | 'quote_scheduled' | 'draft' | 'awaiting_signature' | 'awaiting_payment' | 'paid' | 'repair_scheduled';

// Cache for templates (fetched once per session)
let templatesCache: NotificationTemplate[] | null = null;
let statusCache: StatusConfig[] | null = null;

async function getNotificationTemplate(statusKey: string): Promise<NotificationTemplate | undefined> {
  if (!templatesCache) {
    try {
      const { data } = await supabase
        .from('notification_templates')
        .select('*');
      templatesCache = data || [];
    } catch {
      templatesCache = DEFAULT_NOTIFICATION_TEMPLATES as NotificationTemplate[];
    }
  }
  return templatesCache.find((t) => t.status_key === statusKey);
}

async function getStatusLabel(statusKey: string): Promise<string> {
  if (!statusCache) {
    try {
      const { data } = await supabase
        .from('status_config')
        .select('*');
      statusCache = data || [];
    } catch {
      statusCache = DEFAULT_STATUS_CONFIG as StatusConfig[];
    }
  }
  const status = statusCache.find((s) => s.status_key === statusKey);
  return status?.label || statusKey;
}

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
 * Now reads message templates from the database.
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
  console.log('[Slack] sendStatusChangeNotification called:', { quoteId: quote.id, newStatus, clientName: quote.client_name });

  try {
    // Check if notifications are enabled for this status
    const template = await getNotificationTemplate(newStatus);
    if (template && !template.slack_enabled) {
      console.log('[Slack] Notifications disabled for status:', newStatus);
      return true; // Return true since this is expected behavior
    }

    // Get message from template or use custom message
    const statusMessage = options?.customMessage || await getStatusMessage(
      newStatus,
      quote,
      options?.scheduledDate,
      template
    );

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
      customMessage: statusMessage,
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

    console.log('[Slack] Sending to /api/slack with payload:', JSON.stringify(payload, null, 2));

    const response = await fetch('/api/slack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();
    console.log('[Slack] Response:', response.status, responseData);

    if (!response.ok) {
      console.error('[Slack] Notification failed:', responseData);
      return false;
    }

    console.log('[Slack] Notification sent successfully');
    return true;
  } catch (error) {
    console.error('[Slack] Error sending notification:', error);
    return false;
  }
}

/**
 * Get a human-readable message for a status change
 * Now uses templates from the database with merge tag replacement
 */
async function getStatusMessage(
  status: QuoteStatus,
  quote: Partial<RepairQuote>,
  scheduledDate?: string | null,
  template?: NotificationTemplate
): Promise<string> {
  // If we have a template, use it with merge tag replacement
  if (template?.slack_template) {
    return replaceMergeTags(template.slack_template, {
      customer_name: quote.client_name,
      phone: quote.phone,
      address: quote.address,
      city_state: quote.city_state,
      quote_price: quote.quote_price,
      deposit: quote.deposit,
      scheduled_date: scheduledDate || quote.scheduled_date || quote.quote_appointment_date,
      repair_description: quote.repair_description,
    });
  }

  // Fallback to hardcoded messages if no template found
  const name = quote.client_name || 'Customer';
  const statusLabel = await getStatusLabel(status);

  switch (status) {
    case 'scheduling_quote':
      return `New lead: ${name} - needs quote appointment scheduled`;

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
      return `Status changed to ${statusLabel}`;
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

// Clear template cache (call after admin updates)
export function clearNotificationCache(): void {
  templatesCache = null;
  statusCache = null;
}
