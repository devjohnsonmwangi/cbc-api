// src/utils/stripe.ts
import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
    throw new Error("Stripe secret key is missing. Please set the STRIPE_SECRET_KEY environment variable.");
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20', // Updated to the latest API version
});

async function createStripePaymentIntent(amount: number, currency: string = 'usd', description: string): Promise<string> {
    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount * 100, // Stripe uses smallest currency unit (cents)
            currency: currency,
            automatic_payment_methods: {
                enabled: true,
            },
            description: description,
        });

        if(!paymentIntent.client_secret)
         throw new Error("Stripe Payment Intent creation was unsuccessfull");

        return paymentIntent.client_secret; // Return the client secret
    } catch (error: any) {
        console.error('Error creating Stripe Payment Intent:', error.message);
        throw new Error('Failed to create Stripe Payment Intent');
    }
}

async function retrieveStripePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        return paymentIntent;
    } catch (error: any) {
        console.error('Error retrieving Stripe Payment Intent:', error.message);
        throw new Error('Failed to retrieve Stripe Payment Intent');
    }
}

async function createStripeCheckoutSession(amount: number, currency: string = 'usd', successUrl: string, cancelUrl: string): Promise<string> {
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: currency,
                    product_data: {
                        name: 'Payment', // Or a dynamic name
                    },
                    unit_amount: amount * 100,  // Amount in cents
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: successUrl,  // URL to redirect to after successful payment
            cancel_url: cancelUrl,    // URL to redirect to if the user cancels
        });

        if(!session.url){
             throw new Error("Stripe Session was unsuccessfull");
        }

        return session.url; // Return the checkout session URL
    } catch (error: any) {
        console.error('Error creating Stripe Checkout Session:', error.message);
        throw new Error('Failed to create Stripe Checkout Session');
    }
}

export { createStripePaymentIntent, retrieveStripePaymentIntent, stripe , createStripeCheckoutSession};