import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerSupabaseClient } from '@/lib/supabase-server';

const REUSABLE_PI_STATUSES = new Set<Stripe.PaymentIntent.Status>([
  'requires_payment_method',
  'requires_confirmation',
  'requires_action',
]);

function extractPaymentIntentId(clientSecret: string): string | null {
  const match = clientSecret.match(/^(pi_[^_]+)_secret_/);
  return match ? match[1] : null;
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = (event: string, extra: Record<string, unknown> = {}) => {
    console.log(JSON.stringify({ at: 'create-payment-intent', requestId, event, ...extra }));
  };

  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      log('stripe_secret_missing');
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(secretKey);
    const { amount, quoteId, customerName, customerEmail } = await request.json();

    log('request_received', { quoteId, amount });

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    if (amount < 0.50) {
      return NextResponse.json(
        { error: 'Amount must be at least $0.50' },
        { status: 400 }
      );
    }

    const amountInCents = Math.round(amount * 100);
    const supabase = quoteId ? await createServerSupabaseClient() : null;

    // Try to reuse a cached clientSecret for this quote so repeated Pay Now taps
    // (e.g. mobile retries where the form never mounted) don't create duplicate PaymentIntents.
    if (supabase && quoteId) {
      const { data: quote, error: quoteLookupError } = await supabase
        .from('repair_quotes')
        .select('payment_client_secret')
        .eq('id', quoteId)
        .maybeSingle();

      if (quoteLookupError) {
        log('quote_lookup_failed', { message: quoteLookupError.message });
      } else if (quote?.payment_client_secret) {
        const cachedSecret = quote.payment_client_secret;
        const cachedPiId = extractPaymentIntentId(cachedSecret);

        if (cachedPiId) {
          try {
            const existing = await stripe.paymentIntents.retrieve(cachedPiId);
            const reusable =
              REUSABLE_PI_STATUSES.has(existing.status) &&
              existing.amount === amountInCents &&
              existing.currency === 'usd';

            if (reusable) {
              log('reusing_cached_payment_intent', {
                paymentIntentId: existing.id,
                status: existing.status,
              });
              return NextResponse.json({ clientSecret: cachedSecret });
            }

            log('cached_payment_intent_not_reusable', {
              paymentIntentId: existing.id,
              status: existing.status,
              cachedAmount: existing.amount,
              requestedAmount: amountInCents,
            });
          } catch (retrieveErr) {
            log('cached_payment_intent_retrieve_failed', {
              paymentIntentId: cachedPiId,
              message: retrieveErr instanceof Error ? retrieveErr.message : 'unknown',
            });
          }
        }
      }
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      payment_method_types: ['card'],
      metadata: {
        quoteId: quoteId || '',
        customerName: customerName || '',
        requestId,
      },
      receipt_email: customerEmail || undefined,
      description: `Fence Boys Repair Deposit${customerName ? ` - ${customerName}` : ''}`,
    });

    log('payment_intent_created', { paymentIntentId: paymentIntent.id });

    if (supabase && quoteId && paymentIntent.client_secret) {
      const { error: saveError } = await supabase
        .from('repair_quotes')
        .update({ payment_client_secret: paymentIntent.client_secret })
        .eq('id', quoteId);

      if (saveError) {
        // Non-fatal: payment still works, just no caching on retries.
        log('save_client_secret_failed', { message: saveError.message });
      }
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log('unhandled_error', { message: errorMessage });
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
