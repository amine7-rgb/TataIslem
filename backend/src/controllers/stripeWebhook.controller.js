import { stripeClient } from '../services/stripe.service.js';
import ServiceOrder from '../models/ServiceOrder.js';
import Reservation from '../models/Reservation.js';
import Event from '../models/Event.js';
import {
  sendAdminPaymentMail,
  sendAdminServiceScheduleMail,
  sendConfirmationMail,
  sendServicePaymentPendingMail,
} from '../services/mail.service.js';

export const stripeWebhook = async (req, res) => {
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
    const metadata = session.metadata || {};

    try {
      if (metadata.type === 'service') {
        const order = await ServiceOrder.findOne({ stripeSessionId: session.id });

        if (order && order.paymentStatus !== 'paid') {
          order.paymentStatus = 'paid';
          if (order.scheduleStatus === 'pending_payment' || !order.scheduleStatus) {
            order.scheduleStatus = 'pending_admin_confirmation';
          }
          order.lastScheduleUpdateAt = new Date();
          await order.save();

          await sendServicePaymentPendingMail(order);
          await sendAdminServiceScheduleMail(order, 'new_request');

          console.log('Service payment confirmed');
        }
      }

      if (metadata.type === 'event') {
        const alreadyBooked = await Reservation.findOne({
          userId: metadata.userId,
          eventId: metadata.eventId,
        });

        if (alreadyBooked) {
          return res.json({ received: true });
        }

        const existingReservation = await Reservation.findOne({
          stripeSessionId: session.id,
        });

        if (existingReservation) {
          return res.json({ received: true });
        }

        const eventDoc = await Event.findOneAndUpdate(
          { _id: metadata.eventId, availableSeats: { $gt: 0 } },
          { $inc: { availableSeats: -1 } },
          { new: true },
        );

        if (!eventDoc) {
          return res.json({ received: true });
        }

        const reservation = await Reservation.create({
          userId: metadata.userId,
          fullName: metadata.fullName,
          email: metadata.email,
          phoneNumber: metadata.phoneNumber,
          gender: metadata.gender,
          eventId: eventDoc._id,
          eventTitle: eventDoc.title,
          eventDate: eventDoc.date,
          eventAddress: eventDoc.address,
          amount: eventDoc.price,
          seats: 1,
          stripeSessionId: session.id,
        });

        await sendConfirmationMail(reservation, 'event');
        await sendAdminPaymentMail(reservation, 'event');

        console.log('Event reservation created');
      }
    } catch (err) {
      console.error('Webhook processing error:', err.message);
    }
  }

  return res.json({ received: true });
};
