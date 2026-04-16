import Event from '../models/Event.js';
import Reservation from '../models/Reservation.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 24;
const ALLOWED_FILTERS = new Set(['all', 'new', 'old']);

const parsePositiveInteger = (value, fallback, max = Number.MAX_SAFE_INTEGER) => {
  const parsedValue = Number.parseInt(String(value ?? ''), 10);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return Math.min(parsedValue, max);
};

const getEventsFilter = (rawFilter) => {
  const filter = ALLOWED_FILTERS.has(rawFilter) ? rawFilter : 'all';
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  if (filter === 'new') {
    return {
      filter,
      query: {
        date: { $gte: startOfToday },
      },
      sort: { date: 1 },
    };
  }

  if (filter === 'old') {
    return {
      filter,
      query: {
        date: { $lt: startOfToday },
      },
      sort: { date: -1 },
    };
  }

  return {
    filter,
    query: {},
    sort: { date: 1 },
  };
};

const sanitizeEventPayload = (payload, currentEvent = null) => {
  const title = String(payload.title || '').trim();
  const description = String(payload.description || '').trim();
  const address = String(payload.address || '').trim();
  const image = String(payload.image || '').trim();
  const date = new Date(payload.date);
  const price = Number(payload.price);
  const totalSeats = Number.parseInt(String(payload.totalSeats ?? ''), 10);
  const latitude = Number(payload.latitude);
  const longitude = Number(payload.longitude);

  if (!title) {
    throw new Error('Event title is required');
  }

  if (!description) {
    throw new Error('Event description is required');
  }

  if (!address) {
    throw new Error('Event address is required');
  }

  if (!image) {
    throw new Error('Event image is required');
  }

  if (Number.isNaN(date.getTime())) {
    throw new Error('Please provide a valid event date');
  }

  if (!Number.isFinite(price) || price < 0) {
    throw new Error('Please provide a valid price');
  }

  if (!Number.isInteger(totalSeats) || totalSeats < 1) {
    throw new Error('Please provide a valid seat count');
  }

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error('Please provide a valid latitude');
  }

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error('Please provide a valid longitude');
  }

  const bookedSeats = currentEvent
    ? Math.max(Number(currentEvent.totalSeats || 0) - Number(currentEvent.availableSeats || 0), 0)
    : 0;

  if (currentEvent && totalSeats < bookedSeats) {
    throw new Error(`Total seats cannot be lower than the ${bookedSeats} seats already booked`);
  }

  return {
    title,
    description,
    address,
    image,
    date,
    price,
    totalSeats,
    availableSeats: currentEvent ? totalSeats - bookedSeats : totalSeats,
    location: {
      type: 'Point',
      coordinates: [longitude, latitude],
    },
  };
};

export const createEvent = async (req, res) => {
  try {
    const event = await Event.create(sanitizeEventPayload(req.body));

    res.status(201).json(event);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Unable to create the event' });
  }
};

export const updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const sanitizedPayload = sanitizeEventPayload(req.body, event);
    event.set(sanitizedPayload);
    await event.save();

    return res.json({
      message: 'Event updated successfully',
      event,
    });
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Unable to update the event' });
  }
};

export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const existingReservations = await Reservation.exists({ eventId: event._id });

    if (existingReservations) {
      return res.status(409).json({
        error:
          'This event already has reservations. Edit it instead of deleting it.',
      });
    }

    await event.deleteOne();

    return res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unable to delete the event' });
  }
};

export const getEvents = async (req, res) => {
  try {
    const { filter, query, sort } = getEventsFilter(req.query.filter);
    const hasPaginationRequest =
      typeof req.query.page !== 'undefined' ||
      typeof req.query.limit !== 'undefined' ||
      typeof req.query.filter !== 'undefined';

    if (!hasPaginationRequest) {
      const events = await Event.find(query).sort(sort);
      return res.json(events);
    }

    const limit = parsePositiveInteger(req.query.limit, DEFAULT_LIMIT, MAX_LIMIT);
    const requestedPage = parsePositiveInteger(req.query.page, DEFAULT_PAGE);
    const totalItems = await Event.countDocuments(query);
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const currentPage = Math.min(requestedPage, totalPages);
    const skip = (currentPage - 1) * limit;
    const items = await Event.find(query).sort(sort).skip(skip).limit(limit);

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
    return res.status(500).json({ error: err.message || 'Unable to load events' });
  }
};

export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
