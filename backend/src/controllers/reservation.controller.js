import Event from '../models/Event.js';
import Reservation from '../models/Reservation.js';
import { createCheckoutSession } from '../services/stripe.service.js';
import { validateReservationInput } from '../middleware/validation.js';

const isRecaptchaEnabled = () => {
  if (typeof process.env.RECAPTCHA_ENABLED !== 'undefined') {
    return process.env.RECAPTCHA_ENABLED === 'true';
  }

  return process.env.NODE_ENV === 'production';
};

export const checkoutReservation = async (req, res) => {
  try {
    const errors = validateReservationInput(req.body);
    if (errors.length) {
      return res.status(400).json({ errors });
    }

    const { gender, eventId, token } = req.body;
    const recaptchaEnabled = isRecaptchaEnabled();

    if (recaptchaEnabled) {
      if (!process.env.RECAPTCHA_SECRET) {
        return res.status(503).json({ error: 'Captcha is not configured on the server' });
      }

      if (!token) {
        return res.status(400).json({ error: 'Captcha missing' });
      }

      const captchaRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `secret=${encodeURIComponent(process.env.RECAPTCHA_SECRET)}&response=${encodeURIComponent(token)}`,
      });

      const captchaData = await captchaRes.json();

      if (!captchaData.success) {
        return res.status(400).json({ error: 'Captcha verification failed' });
      }
    }

    const event = await Event.findById(eventId);

    if (!event || event.availableSeats <= 0) {
      return res.status(400).json({ error: 'Event full or not found' });
    }

    if (new Date(event.date) < new Date()) {
      return res.status(400).json({ error: 'Event expired' });
    }

    const existingReservation = await Reservation.findOne({
      userId: req.user._id,
      eventId: event._id,
    });

    if (existingReservation) {
      return res.status(400).json({ error: 'You already booked this event' });
    }

    const session = await createCheckoutSession(
      event,
      {
        userId: req.user._id.toString(),
        fullName: `${req.user.firstName} ${req.user.lastName}`.trim(),
        email: req.user.email,
        phoneNumber: req.user.phoneNumber,
        gender,
        eventId: event._id.toString(),
      },
      req.headers.origin,
    );

    return res.json({ url: session.url });
  } catch (err) {
    console.error('Reservation checkout error:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
};
