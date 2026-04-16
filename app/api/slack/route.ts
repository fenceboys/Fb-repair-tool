import { NextRequest, NextResponse } from 'next/server';

interface QuotePayload {
  client_name: string;
  phone: string;
  email?: string;
  address: string;
  city_state?: string;
  quote_price?: number;
  base_cost?: number;
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
        `*Phone:* ${quote.phone || 'N/A'}`,
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
      `*Phone:* ${quote.phone}`,
      `*Address:* ${quote.address}${quote.city_state ? `, ${quote.city_state}` : ''}`,
      `*Quote Price:* ${formatCurrency(quotePrice)}`,
      quote.requires_deposit
        ? `*Deposit Due:* ${formatCurrency(deposit)}`
        : `*Amount Due:* ${formatCurrency(quotePrice)}`,
    ];

    if (quote.repair_description?.trim()) {
      messageLines.push('', `*Repair:* ${quote.repair_description}`);
    }

    if (customMessage?.trim()) {
      messageLines.push('', `*Note:* ${customMessage}`);
    }

    // Add payout breakdown
    messageLines.push(
      '',
      '---',
      `*Payout Breakdown:*`,
      `• Colt: ${formatCurrency(coltPayout)}`,
      `• FB Margin: ${formatCurrency(fbMargin)}`,
      '---'
    );

    const initialComment = messageLines.join('\n');

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
          files: [{ id: uploadUrlData.file_id, title: filename || 'quote.pdf' }],
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
