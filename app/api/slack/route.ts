import { NextRequest, NextResponse } from 'next/server';

interface QuotePayload {
  client_name: string;
  phone: string;
  email?: string;
  address: string;
  city_state?: string;
  quote_price: number;
  deposit: number;
  requires_deposit: boolean;
  repair_description?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { quote, pdfUrl } = (await request.json()) as { quote: QuotePayload; pdfUrl?: string };

    const webhookUrl = process.env.SLACK_WEBHOOK_URL;

    if (!webhookUrl || webhookUrl === 'your-slack-webhook-url-here') {
      console.warn('Slack webhook URL not configured');
      return NextResponse.json(
        { success: true, message: 'Slack not configured - skipped' },
        { status: 200 }
      );
    }

    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
      }).format(amount);

    const message = {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🔧 New Repair Quote',
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Customer:*\n${quote.client_name}`,
            },
            {
              type: 'mrkdwn',
              text: `*Phone:*\n${quote.phone}`,
            },
          ],
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Address:*\n${quote.address}${quote.city_state ? `, ${quote.city_state}` : ''}`,
            },
            {
              type: 'mrkdwn',
              text: `*Quote Price:*\n${formatCurrency(quote.quote_price)}`,
            },
          ],
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: quote.requires_deposit
                ? `*Deposit (50%):*\n${formatCurrency(quote.deposit)}`
                : `*Amount Due:*\n${formatCurrency(quote.quote_price)} (Full)`,
            },
          ],
        },
      ],
    };

    // Add repair description if present
    if (quote.repair_description?.trim()) {
      message.blocks.push({
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Repair Description:*\n${quote.repair_description}`,
          },
        ],
      });
    }

    // Add PDF link if present
    if (pdfUrl) {
      message.blocks.push({
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Contract PDF:*\n<${pdfUrl}|Download PDF>`,
          },
        ],
      });
    }

    // Add action item for Cielo
    const cieloUserId = process.env.CIELO_SLACK_USER_ID;
    const contactInfo = quote.email ? quote.email : quote.phone;
    const amountDue = quote.requires_deposit ? quote.deposit : quote.quote_price;
    const paymentType = quote.requires_deposit ? '(50% deposit)' : '(full payment)';

    // Use text field instead of fields for better mention support
    message.blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: cieloUserId
          ? `<@${cieloUserId}> create stripe link for *${formatCurrency(amountDue)}* ${paymentType} & send to *${contactInfo}* with copy of PDF`
          : `*@Cielo* create stripe link for *${formatCurrency(amountDue)}* ${paymentType} & send to *${contactInfo}* with copy of PDF`,
      },
    });

    message.blocks.push({
      type: 'context',
      // @ts-expect-error - Slack block types are flexible
      elements: [
        {
          type: 'mrkdwn',
          text: `Sent from Fence Boys Repair Tool • ${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })}`,
        },
      ],
    });

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(`Slack responded with ${response.status}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending to Slack:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send to Slack' },
      { status: 500 }
    );
  }
}
