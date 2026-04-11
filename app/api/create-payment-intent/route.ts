import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      console.error('STRIPE_SECRET_KEY is not set');
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(secretKey);
    const { amount, quoteId, customerName, customerEmail } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    console.log('Creating payment intent for amount:', amount);

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        quoteId: quoteId || '',
        customerName: customerName || '',
      },
      receipt_email: customerEmail || undefined,
      description: `Fence Boys Repair Deposit${customerName ? ` - ${customerName}` : ''}`,
    });

    console.log('Payment intent created:', paymentIntent.id);
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating payment intent:', errorMessage);
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
