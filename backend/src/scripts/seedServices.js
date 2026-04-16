import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import Service from '../models/Service.js';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const services = [
  {
    title: 'PRIVATE IMMERSION',
    shortDesc: 'Deep Identity Recalibration',
    fullDesc: `For high-level individuals who are successful but internally scattered.

You arrive with:
- Mental noise
- Too many options
- Delayed decisions
- Hidden doubt

You leave with:
- Nervous system regulated
- One precise direction
- Clear strategic execution plan
- Embodied confidence and leadership

Best for: CEOs, founders, visible leaders.`,
    price: 10000,
    image: '/images/relationship.webp',
  },
  {
    title: 'PRECISION MENTORSHIP',
    shortDesc: '3 Months of Self-Mastery',
    fullDesc: `We reset your nervous system, close mental loops and train decision precision.

You build:
- Self-mastery
- Emotional stability
- Consistent execution
- Internal authority`,
    price: 3000,
    image: '/images/business.png',
  },
  {
    title: 'STAGE & PRESENCE MASTERY',
    shortDesc: 'Command the Room. Lead the Energy.',
    fullDesc: `Build embodied authority, voice control and nervous system stability under pressure.

You learn to:
- Hold attention
- Direct interaction
- Become the stage`,
    price: 5000,
    image: '/images/development.png',
  },
  {
    title: 'PERSONAL BRAND & FREEDOM SYSTEM',
    shortDesc: 'Visibility. Authority. Scalable Income.',
    fullDesc: `Define your product, positioning and high-ticket offer.

Build systems that generate income — even when you are not working.`,
    price: 5000,
    image: '/images/leadership.png',
  },
];

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    for (let svc of services) {
      const product = await stripe.products.create({
        name: svc.title,
        description: svc.shortDesc,
      });

      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: svc.price * 100,
        currency: 'eur',
      });

      const serviceDoc = await Service.create({
        title: svc.title,
        shortDesc: svc.shortDesc,
        fullDesc: svc.fullDesc,
        price: svc.price,
        stripePriceId: price.id,
        image: svc.image,
      });

      console.log(`✅ Service created: ${serviceDoc.title} (StripePriceId: ${price.id})`);
    }

    console.log('🎯 All services created successfully');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
