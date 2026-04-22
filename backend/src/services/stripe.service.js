import Stripe from 'stripe';
import dotenv from 'dotenv';
import { buildClientRouteUrl } from '../config/clientOrigins.js';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeClient = stripe;

const resolveCheckoutUrls = (clientBaseUrl) => {
  return {
    successUrl:
      buildClientRouteUrl(clientBaseUrl, '/payment/success') ||
      process.env.CLIENT_SUCCESS_URL,
    cancelUrl:
      buildClientRouteUrl(clientBaseUrl, '/payment/cancel') || process.env.CLIENT_CANCEL_URL,
  };
};

export const createCheckoutSession = async (event, metadata, clientBaseUrl) => {
  const { successUrl, cancelUrl } = resolveCheckoutUrls(clientBaseUrl);

  return await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: metadata.email,
    billing_address_collection: 'auto',
    locale: 'fr',
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: event.title,
            description: `Event on ${new Date(event.date).toLocaleDateString('fr-FR')}`,
          },
          unit_amount: Math.round(event.price * 100),
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      ...metadata,
      type: 'event',
    },
  });
};

export const createServiceCheckoutSession = async (service, metadata, clientBaseUrl) => {
  const { successUrl, cancelUrl } = resolveCheckoutUrls(clientBaseUrl);
  const useInlinePriceData =
    process.env.NODE_ENV !== 'production' || !String(service.stripePriceId || '').trim();

  const serviceLineItem = useInlinePriceData
    ? {
        price_data: {
          currency: 'eur',
          product_data: {
            name: service.title,
            description: service.shortDesc || service.fullDesc || 'Premium service booking',
          },
          unit_amount: Math.round(Number(service.price || 0) * 100),
        },
        quantity: 1,
      }
    : {
        price: service.stripePriceId,
        quantity: 1,
      };

  return await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: metadata.email,
    billing_address_collection: 'auto',
    locale: 'fr',
    line_items: [serviceLineItem],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      ...metadata,
      type: 'service',
    },
  });
};
