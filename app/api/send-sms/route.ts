import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Server-only proxy for sending an SMS via Quo (formerly OpenPhone).
 * Keeps QUO_API_KEY off the client. Failures here are non-fatal to the
 * calling flow — the Send Proposal action should still complete even if
 * SMS doesn't land (e.g. A2P registration pending, insufficient credits).
 *
 * When a customerId is provided, the outbound message is logged to
 * customer_messages so the communications timeline on the customer profile
 * shows what was sent from the app.
 *
 * Env vars required in prod:
 *   - QUO_API_KEY         → the apiKey header value
 *   - QUO_FROM_NUMBER     → Colt's line in E.164, e.g. "+17405278899"
 */

interface SendSmsBody {
  to: string;
  content: string;
  customerId?: string | null;
  quoteId?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const { to, content, customerId, quoteId } = (await request.json()) as SendSmsBody;

    if (!to || !content) {
      return NextResponse.json(
        { success: false, error: 'to and content are required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.QUO_API_KEY;
    const fromNumber = process.env.QUO_FROM_NUMBER;

    if (!apiKey || !fromNumber) {
      console.warn('[send-sms] QUO_API_KEY or QUO_FROM_NUMBER not configured');
      return NextResponse.json(
        { success: false, error: 'SMS not configured', skipped: true },
        { status: 200 }
      );
    }

    const response = await fetch('https://api.openphone.com/v1/messages', {
      method: 'POST',
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromNumber,
        to: [to],
        content,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('[send-sms] Quo API error:', response.status, data);
      return NextResponse.json(
        {
          success: false,
          error: data?.message || data?.error || `Quo API returned ${response.status}`,
          status: response.status,
        },
        { status: 502 }
      );
    }

    const quoMessageId = data?.data?.id ?? data?.id ?? null;

    if (customerId) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (supabaseUrl && supabaseKey) {
        try {
          const sb = createClient(supabaseUrl, supabaseKey);
          await sb.from('customer_messages').insert({
            customer_id: customerId,
            quote_id: quoteId ?? null,
            direction: 'outbound',
            to_number: to,
            from_number: fromNumber,
            content,
            quo_message_id: quoMessageId,
            status: 'sent',
          });
        } catch (logErr) {
          console.error('[send-sms] Failed to log customer_message:', logErr);
        }
      }
    }

    return NextResponse.json({ success: true, id: quoMessageId });
  } catch (error) {
    console.error('[send-sms] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send SMS',
      },
      { status: 500 }
    );
  }
}
