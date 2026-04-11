import { NextRequest, NextResponse } from 'next/server';

interface QuotePayload {
  client_name: string;
  phone: string;
  email?: string;
  address: string;
  city_state?: string;
  quote_price: number;
  base_cost?: number;
  deposit: number;
  requires_deposit: boolean;
  repair_description?: string;
  status: 'draft' | 'sent' | 'signed' | 'paid';
  link_sent?: boolean; // true if customer has received the link
}

interface SlackUploadRequest {
  quote: QuotePayload;
  pdfBase64: string;
  filename: string;
  customMessage?: string;
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
  try {
    const { quote, pdfBase64, filename, customMessage } =
      (await request.json()) as SlackUploadRequest;

    const botToken = process.env.SLACK_BOT_TOKEN;
    const channelId = process.env.SLACK_CHANNEL_ID;

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
          filename: filename,
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
    const amountDue = quote.requires_deposit ? quote.deposit : quote.quote_price;

    // Calculate payout breakdown (75% Colt, 25% FB Margin)
    const coltPayout = quote.quote_price * 0.75;
    const fbMargin = quote.quote_price * 0.25;

    // Determine status display
    const getStatusLine = () => {
      switch (quote.status) {
        case 'paid':
          return `:white_check_mark: *PAID* - Complete`;
        case 'signed':
          return `:pencil: *SIGNED* - Awaiting Payment (${formatCurrency(amountDue)})`;
        case 'sent':
          return `:envelope_with_arrow: *LINK SENT* - Awaiting Customer Signature`;
        case 'draft':
        default:
          if (quote.link_sent) {
            return `:envelope_with_arrow: *LINK SENT* - Awaiting Customer Signature`;
          }
          return `:new: *NEW QUOTE* - Send link to customer`;
      }
    };

    let messageLines = [
      `:wrench: *Repair Quote - ${quote.client_name}*`,
      '',
      getStatusLine(),
      '',
      `*Phone:* ${quote.phone}`,
      `*Address:* ${quote.address}${quote.city_state ? `, ${quote.city_state}` : ''}`,
      `*Quote Price:* ${formatCurrency(quote.quote_price)}`,
      quote.requires_deposit
        ? `*Deposit Due:* ${formatCurrency(quote.deposit)}`
        : `*Amount Due:* ${formatCurrency(quote.quote_price)}`,
    ];

    if (quote.repair_description?.trim()) {
      messageLines.push('', `*Repair:* ${quote.repair_description}`);
    }

    if (customMessage?.trim()) {
      messageLines.push('', `:memo: *Note:* ${customMessage}`);
    }

    // Add payout breakdown
    messageLines.push(
      '',
      '---',
      `:moneybag: *Payout Breakdown:*`,
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
          files: [{ id: uploadUrlData.file_id, title: filename }],
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
