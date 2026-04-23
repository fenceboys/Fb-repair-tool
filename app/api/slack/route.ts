import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const PHOTOS_BUCKET = 'quote-photos';

interface QuotePayload {
  id?: string;
  client_name: string;
  phone: string;
  email?: string;
  address: string;
  city_state?: string;
  quote_price?: number;
  base_cost?: number;
  material_cost?: number | null;
  labor_cost?: number | null;
  materials_notes?: string | null;
  deposit?: number;
  requires_deposit?: boolean;
  repair_description?: string;
  status?: 'scheduling_quote' | 'quote_scheduled' | 'draft' | 'awaiting_signature' | 'awaiting_payment' | 'paid' | 'repair_scheduled';
  link_sent?: boolean; // true if customer has received the link
  scheduled_date?: string | null;
  quote_appointment_date?: string | null;
}

interface SlackUploadRequest {
  quote: QuotePayload;
  pdfBase64?: string;
  filename?: string;
  customMessage?: string;
  basicInfoOnly?: boolean; // If true, just send basic contact info without PDF
}

interface SlackUploadUrlResponse {
  ok: boolean;
  upload_url: string;
  file_id: string;
  error?: string;
}

interface SlackCompleteResponse {
  ok: boolean;
  error?: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);

// Fetch quote_photos for a given quote, download each from Supabase storage,
// upload each to Slack, and return the `{id, title}` entries to pass to
// `files.completeUploadExternal`. Returns an empty array if no photos exist or
// if Supabase creds are missing. Failures for individual photos are logged but
// do not abort the Slack send.
async function uploadQuotePhotosToSlack(
  quoteId: string | undefined,
  botToken: string
): Promise<Array<{ id: string; title: string }>> {
  if (!quoteId) return [];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return [];

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: photos, error } = await supabase
    .from('quote_photos')
    .select('id, storage_path, filename, file_size, mime_type')
    .eq('quote_id', quoteId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[Slack] Failed to load quote photos:', error);
    return [];
  }
  if (!photos || photos.length === 0) return [];

  const uploaded: Array<{ id: string; title: string }> = [];

  for (const photo of photos) {
    try {
      const { data: blob, error: dlErr } = await supabase.storage
        .from(PHOTOS_BUCKET)
        .download(photo.storage_path);
      if (dlErr || !blob) {
        console.error('[Slack] Photo download failed:', photo.storage_path, dlErr);
        continue;
      }
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = Buffer.from(arrayBuffer);

      const urlRes = await fetch(
        'https://slack.com/api/files.getUploadURLExternal',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${botToken}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            filename: photo.filename || 'photo.jpg',
            length: bytes.length.toString(),
          }),
        }
      );
      const urlData: SlackUploadUrlResponse = await urlRes.json();
      if (!urlData.ok) {
        console.error('[Slack] getUploadURL failed for photo:', photo.storage_path, urlData.error);
        continue;
      }

      const putRes = await fetch(urlData.upload_url, {
        method: 'POST',
        headers: { 'Content-Type': photo.mime_type || 'application/octet-stream' },
        body: bytes,
      });
      if (!putRes.ok) {
        console.error('[Slack] Photo PUT failed:', photo.storage_path, putRes.status);
        continue;
      }

      uploaded.push({ id: urlData.file_id, title: photo.filename || 'photo' });
    } catch (err) {
      console.error('[Slack] Unexpected photo upload error:', photo.storage_path, err);
    }
  }

  return uploaded;
}

// Normalize a phone number for Slack display. Slack auto-linkifies raw phone
// patterns into `<tel:...|...>` mrkdwn links and some clients render the link
// syntax as literal text. Also handles DB values that were saved already
// containing that literal syntax. Emits a well-formed Slack tel: link or a
// plain "(xxx) xxx-xxxx" string with a zero-width space inserted to prevent
// re-linkification.
const formatPhoneForSlack = (raw: string | null | undefined): string => {
  if (!raw) return 'N/A';
  // Strip any existing `<tel:...|DISPLAY>` wrap and keep the DISPLAY
  const unwrapped = raw.replace(/<tel:[^|>]*\|?([^>]*)>/g, '$1').trim();
  const digits = unwrapped.replace(/\D/g, '');
  if (digits.length === 10) {
    const display = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    return `<tel:+1${digits}|${display}>`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    const d = digits.slice(1);
    const display = `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
    return `<tel:+1${d}|${display}>`;
  }
  return unwrapped || 'N/A';
};

export async function POST(request: NextRequest) {
  console.log('[Slack API] Received request');

  try {
    const { quote, pdfBase64, filename, customMessage, basicInfoOnly } =
      (await request.json()) as SlackUploadRequest;

    console.log('[Slack API] Parsed request:', { clientName: quote?.client_name, status: quote?.status, basicInfoOnly });

    const botToken = process.env.SLACK_BOT_TOKEN;
    const channelId = process.env.SLACK_CHANNEL_ID;

    console.log('[Slack API] Token configured:', !!botToken && botToken !== 'xoxb-your-bot-token-here');
    console.log('[Slack API] Channel configured:', !!channelId && channelId !== 'C0XXXXXXX');

    if (!botToken || botToken === 'xoxb-your-bot-token-here') {
      console.warn('Slack bot token not configured');
      return NextResponse.json(
        { success: true, message: 'Slack not configured - skipped' },
        { status: 200 }
      );
    }

    if (!channelId || channelId === 'C0XXXXXXX') {
      console.warn('Slack channel ID not configured');
      return NextResponse.json(
        { success: true, message: 'Slack channel not configured - skipped' },
        { status: 200 }
      );
    }

    // If basicInfoOnly, send a status update message without PDF upload
    if (basicInfoOnly) {
      // Get status-specific emoji and header
      const getStatusHeader = () => {
        const formatDateTime = (dateStr: string) => {
          const date = new Date(dateStr);
          return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          });
        };

        switch (quote.status) {
          case 'scheduling_quote':
            return `*NEW LEAD* - ${quote.client_name}\nNeeds quote appointment scheduled`;
          case 'quote_scheduled':
            const quoteDate = quote.quote_appointment_date || quote.scheduled_date;
            return `*QUOTE SCHEDULED* - ${quote.client_name}${quoteDate ? `\n${formatDateTime(quoteDate)}` : ''}`;
          case 'awaiting_signature':
            return `*PROPOSAL SENT* - ${quote.client_name}`;
          case 'awaiting_payment':
            return `*CONTRACT SIGNED* - ${quote.client_name}\nAwaiting payment`;
          case 'paid':
            return `*PAYMENT RECEIVED* - ${quote.client_name}\nReady to schedule repair!`;
          case 'repair_scheduled':
            const repairDate = quote.scheduled_date;
            return `*REPAIR SCHEDULED* - ${quote.client_name}${repairDate ? `\n${formatDateTime(repairDate)}` : ''}`;
          default:
            return `*${quote.client_name || 'Customer'}*`;
        }
      };

      const messageLines = [
        getStatusHeader(),
        '',
        `*Address:* ${quote.address || 'N/A'}${quote.city_state ? `, ${quote.city_state}` : ''}`,
        `*Phone:* ${formatPhoneForSlack(quote.phone)}`,
      ];

      // Add quote price for relevant statuses
      if (quote.quote_price && quote.quote_price > 0 && quote.status !== 'quote_scheduled' && quote.status !== 'draft' && quote.status !== 'scheduling_quote') {
        messageLines.push(`*Quote:* ${formatCurrency(quote.quote_price)}`);
      }

      // Add custom message if provided
      if (customMessage?.trim()) {
        messageLines.push('', `💬 ${customMessage}`);
      }

      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: channelId,
          text: messageLines.join('\n'),
        }),
      });

      const data = await response.json();
      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error}`);
      }

      return NextResponse.json({ success: true });
    }

    // Full message with PDF upload
    if (!pdfBase64) {
      return NextResponse.json(
        { success: false, error: 'PDF data required for full message' },
        { status: 400 }
      );
    }

    // Decode base64 PDF to binary
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');

    // Step 1: Get upload URL from Slack
    const uploadUrlResponse = await fetch(
      'https://slack.com/api/files.getUploadURLExternal',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${botToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          filename: filename || 'quote.pdf',
          length: pdfBuffer.length.toString(),
        }),
      }
    );

    const uploadUrlData: SlackUploadUrlResponse = await uploadUrlResponse.json();

    if (!uploadUrlData.ok) {
      console.error('Failed to get upload URL:', uploadUrlData.error);
      throw new Error(`Slack API error: ${uploadUrlData.error}`);
    }

    // Step 2: Upload the file bytes to the provided URL
    const uploadResponse = await fetch(uploadUrlData.upload_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      body: pdfBuffer,
    });

    if (!uploadResponse.ok) {
      throw new Error(`File upload failed: ${uploadResponse.status}`);
    }

    // Build the message for initial_comment
    const quotePrice = quote.quote_price || 0;
    const deposit = quote.deposit || 0;
    const amountDue = quote.requires_deposit ? deposit : quotePrice;

    // Calculate payout breakdown (75% Colt, 25% FB Margin)
    const coltPayout = quotePrice * 0.75;
    const fbMargin = quotePrice * 0.25;

    // Determine status display
    const getStatusLine = () => {
      switch (quote.status) {
        case 'repair_scheduled':
          return `*REPAIR SCHEDULED* - Work scheduled`;
        case 'paid':
          return `*PAID* - Complete`;
        case 'awaiting_payment':
          return `*SIGNED* - Awaiting Payment (${formatCurrency(amountDue)})`;
        case 'awaiting_signature':
          return `*LINK SENT* - Awaiting Customer Signature`;
        case 'quote_scheduled':
          return `*QUOTE SCHEDULED* - Quote appointment scheduled`;
        case 'scheduling_quote':
          return `*NEW LEAD* - Needs quote appointment scheduled`;
        case 'draft':
        default:
          if (quote.link_sent) {
            return `*LINK SENT* - Awaiting Customer Signature`;
          }
          return `*NEW QUOTE* - Send link to customer`;
      }
    };

    let messageLines = [
      `*Repair Quote - ${quote.client_name}*`,
      '',
      getStatusLine(),
      '',
      `*Phone:* ${formatPhoneForSlack(quote.phone)}`,
      `*Address:* ${quote.address}${quote.city_state ? `, ${quote.city_state}` : ''}`,
    ];

    if (quote.repair_description?.trim()) {
      messageLines.push('', `*Repair:* ${quote.repair_description}`);
    }

    if (customMessage?.trim()) {
      messageLines.push('', `*Note:* ${customMessage}`);
    }

    // Financial breakdown block — Cost + Payout + Quote/Amount grouped at the bottom.
    const materialCost = quote.material_cost ?? null;
    const laborCost = quote.labor_cost ?? null;
    messageLines.push('', '---');

    if (materialCost !== null || laborCost !== null) {
      messageLines.push(
        `*Cost Breakdown:*`,
        `• Material: ${formatCurrency(materialCost ?? 0)}`,
        `• Labor: ${formatCurrency(laborCost ?? 0)}`,
        `• Total Cost: ${formatCurrency((materialCost ?? 0) + (laborCost ?? 0))}`
      );
      if (quote.materials_notes?.trim()) {
        messageLines.push(`• Notes: ${quote.materials_notes.trim()}`);
      }
      messageLines.push('');
    }

    messageLines.push(
      `*Payout Breakdown:*`,
      `• Colt: ${formatCurrency(coltPayout)}`,
      `• FB Margin: ${formatCurrency(fbMargin)}`,
      '',
      `*Quote Price:* ${formatCurrency(quotePrice)}`,
      quote.requires_deposit
        ? `*Deposit Due:* ${formatCurrency(deposit)}`
        : `*Amount Due:* ${formatCurrency(quotePrice)}`,
      '---'
    );

    const initialComment = messageLines.join('\n');

    // Step 2b: Upload any attached quote photos so they appear with the proposal.
    const photoFiles = await uploadQuotePhotosToSlack(quote.id, botToken);

    // Step 3: Complete the upload and share to channel
    const completeResponse = await fetch(
      'https://slack.com/api/files.completeUploadExternal',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: [
            { id: uploadUrlData.file_id, title: filename || 'quote.pdf' },
            ...photoFiles,
          ],
          channel_id: channelId,
          initial_comment: initialComment,
        }),
      }
    );

    const completeData: SlackCompleteResponse = await completeResponse.json();

    if (!completeData.ok) {
      console.error('Failed to complete upload:', completeData.error);
      throw new Error(`Slack API error: ${completeData.error}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending to Slack:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send to Slack',
      },
      { status: 500 }
    );
  }
}
