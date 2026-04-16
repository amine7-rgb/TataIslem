import Service from '../models/Service.js';
import ServiceOrder from '../models/ServiceOrder.js';
import { stripeClient, createServiceCheckoutSession } from '../services/stripe.service.js';
import { validateServiceInput } from '../middleware/validation.js';
import {
  buildScheduleSlot,
  resolveServiceDurationMinutes,
} from '../services/serviceSchedule.service.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 24;
const ALLOWED_FILTERS = new Set(['all', 'linked', 'inline']);

const parsePositiveInteger = (value, fallback, max = Number.MAX_SAFE_INTEGER) => {
  const parsedValue = Number.parseInt(String(value ?? ''), 10);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return Math.min(parsedValue, max);
};

const sanitizeServicePayload = (payload) => {
  const title = String(payload.title || '').trim();
  const shortDesc = String(payload.shortDesc || '').trim();
  const fullDesc = String(payload.fullDesc || '').trim();
  const image = String(payload.image || '').trim();
  const stripePriceId = String(payload.stripePriceId || '').trim();
  const price = Number(payload.price);
  const durationMinutes = resolveServiceDurationMinutes({
    durationMinutes: payload.durationMinutes,
  });

  if (!title) {
    throw new Error('Service title is required');
  }

  if (!shortDesc) {
    throw new Error('Short description is required');
  }

  if (!fullDesc) {
    throw new Error('Full description is required');
  }

  if (!Number.isFinite(price) || price < 0) {
    throw new Error('Please provide a valid price');
  }

  return {
    title,
    shortDesc,
    fullDesc,
    price,
    durationMinutes,
    stripePriceId,
    image,
    active: true,
  };
};

const getServicesFilter = (rawFilter) => {
  const filter = ALLOWED_FILTERS.has(rawFilter) ? rawFilter : 'all';

  if (filter === 'linked') {
    return {
      filter,
      query: {
        active: true,
        stripePriceId: {
          $nin: ['', null],
        },
      },
    };
  }

  if (filter === 'inline') {
    return {
      filter,
      query: {
        active: true,
        $or: [
          { stripePriceId: '' },
          { stripePriceId: null },
          { stripePriceId: { $exists: false } },
        ],
      },
    };
  }

  return {
    filter,
    query: { active: true },
  };
};

export const getServices = async (req, res) => {
  try {
    const { filter, query } = getServicesFilter(req.query.filter);
    const hasPaginationRequest =
      typeof req.query.page !== 'undefined' ||
      typeof req.query.limit !== 'undefined' ||
      typeof req.query.filter !== 'undefined';

    if (!hasPaginationRequest) {
      const services = await Service.find(query).sort({ createdAt: -1 });
      return res.json(services);
    }

    const limit = parsePositiveInteger(req.query.limit, DEFAULT_LIMIT, MAX_LIMIT);
    const requestedPage = parsePositiveInteger(req.query.page, DEFAULT_PAGE);
    const totalItems = await Service.countDocuments(query);
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const currentPage = Math.min(requestedPage, totalPages);
    const skip = (currentPage - 1) * limit;
    const items = await Service.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);

    return res.json({
      items,
      pagination: {
        page: currentPage,
        limit,
        totalItems,
        totalPages,
        hasPreviousPage: currentPage > 1,
        hasNextPage: currentPage < totalPages,
      },
      filter,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};

export const createService = async (req, res) => {
  try {
    const service = await Service.create(sanitizeServicePayload(req.body));

    res.status(201).json({ message: 'Service created', service });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Unable to create the service' });
  }
};

export const updateService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    service.set(sanitizeServicePayload(req.body));
    await service.save();

    return res.json({
      message: 'Service updated successfully',
      service,
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Unable to update the service' });
  }
};

export const deleteService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const hasOrders = await ServiceOrder.exists({ serviceId: service._id });

    if (hasOrders) {
      service.active = false;
      await service.save();

      return res.json({
        message: 'Service archived successfully because existing orders are linked to it',
      });
    }

    await service.deleteOne();

    return res.json({ message: 'Service deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Unable to delete the service' });
  }
};

export const checkoutService = async (req, res) => {
  try {
    const errors = validateServiceInput(req.body);
    if (errors.length) {
      return res.status(400).json({ errors });
    }

    const { serviceId, requestedStartAt } = req.body;
    const service = await Service.findById(serviceId);

    if (!service || !service.active) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const durationMinutes = resolveServiceDurationMinutes(service);
    const requestedSlot = buildScheduleSlot(requestedStartAt, durationMinutes);

    const session = await createServiceCheckoutSession(
      service,
      {
        userId: req.user._id.toString(),
        fullName: `${req.user.firstName} ${req.user.lastName}`.trim(),
        email: req.user.email,
        phoneNumber: req.user.phoneNumber,
        serviceId: service._id.toString(),
        requestedStartAt: requestedSlot.startAt.toISOString(),
        type: 'service',
      },
      req.headers.origin,
    );

    await ServiceOrder.create({
      userId: req.user._id,
      fullName: `${req.user.firstName} ${req.user.lastName}`.trim(),
      email: req.user.email,
      phoneNumber: req.user.phoneNumber,
      serviceId: service._id,
      serviceTitle: service.title,
      amount: service.price,
      durationMinutes,
      requestedSlot,
      currentSlot: requestedSlot,
      scheduleStatus: 'pending_payment',
      lastScheduleUpdateAt: new Date(),
      paymentStatus: 'pending',
      stripeSessionId: session.id,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({
      error:
        process.env.NODE_ENV === 'development'
          ? err.message || 'Service checkout failed'
          : 'Server error',
    });
  }
};

export const serviceWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripeClient.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const metadata = session.metadata;

    try {
      const order = await ServiceOrder.findOne({
        serviceId: metadata.serviceId,
        email: metadata.email,
      });

      if (order) {
        order.paymentStatus = 'paid';
        if (order.scheduleStatus === 'pending_payment') {
          order.scheduleStatus = 'pending_admin_confirmation';
        }
        order.lastScheduleUpdateAt = new Date();
        await order.save();

        console.log('Service payment confirmed and emails sent');
      }
    } catch (err) {
      console.error('Webhook processing error:', err.message);
    }
  }

  res.json({ received: true });
};
