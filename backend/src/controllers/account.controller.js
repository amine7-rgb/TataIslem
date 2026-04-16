import Reservation from '../models/Reservation.js';
import Review from '../models/Review.js';
import ServiceOrder from '../models/ServiceOrder.js';
import User from '../models/User.js';
import { saveOwnReview as saveOwnReviewController } from './review.controller.js';
import { sanitizeUser } from '../services/auth.service.js';
import { findMatchingSlot } from '../services/serviceSchedule.service.js';
import { sendAdminServiceScheduleMail } from '../services/mail.service.js';

export const getAccountOverview = async (req, res) => {
  try {
    const [reservations, serviceOrders, review] = await Promise.all([
      Reservation.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean(),
      ServiceOrder.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean(),
      Review.findOne({ userId: req.user._id }).sort({ updatedAt: -1 }).lean(),
    ]);

    return res.json({
      user: req.authUser,
      reservations,
      serviceOrders,
      review,
    });
  } catch {
    return res.status(500).json({ error: 'Unable to load account data' });
  }
};

export const saveOwnReview = saveOwnReviewController;

export const selectServiceAlternative = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { selectedStartAt } = req.body || {};
    const order = await ServiceOrder.findOne({
      _id: orderId,
      userId: req.user._id,
      paymentStatus: 'paid',
    });

    if (!order) {
      return res.status(404).json({ error: 'Service reservation not found' });
    }

    if (order.scheduleStatus !== 'pending_client_selection') {
      return res
        .status(400)
        .json({ error: 'This reservation is not waiting for a new client choice' });
    }

    const matchingSlot = findMatchingSlot(order.alternativeSlots, selectedStartAt);

    if (!matchingSlot) {
      return res.status(400).json({ error: 'Please choose one of the proposed dates' });
    }

    order.currentSlot = matchingSlot;
    order.alternativeSlots = [];
    order.scheduleStatus = 'pending_admin_confirmation';
    order.lastScheduleUpdateAt = new Date();
    await order.save();

    await sendAdminServiceScheduleMail(order, 'client_selected_slot');

    return res.json({
      message: 'Your new time was sent to the admin for confirmation',
      order,
    });
  } catch {
    return res.status(500).json({ error: 'Unable to select a new time slot' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const updates = {};
    const allowedFields = ['firstName', 'lastName', 'phoneNumber', 'address'];

    for (const field of allowedFields) {
      if (req.body[field] != null) {
        updates[field] = String(req.body[field]).trim();
      }
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'avatarUrl')) {
      if (req.body.avatarUrl == null || String(req.body.avatarUrl).trim() === '') {
        updates.avatarUrl = null;
      } else {
        const avatarUrl = String(req.body.avatarUrl).trim();
        const isSupportedImageDataUrl =
          /^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(avatarUrl);

        if (!isSupportedImageDataUrl) {
          return res.status(400).json({ error: 'Please provide a valid profile image' });
        }

        if (avatarUrl.length > 1_500_000) {
          return res.status(400).json({ error: 'Profile image is too large' });
        }

        updates.avatarUrl = avatarUrl;
      }
    }

    if (updates.firstName && updates.firstName.length < 2) {
      return res.status(400).json({ error: 'First name must contain at least 2 characters' });
    }

    if (updates.lastName && updates.lastName.length < 2) {
      return res.status(400).json({ error: 'Last name must contain at least 2 characters' });
    }

    if (updates.phoneNumber && !/^\+\d{8,15}$/.test(updates.phoneNumber)) {
      return res.status(400).json({ error: 'Please provide a valid international phone number' });
    }

    if (updates.address && updates.address.length < 5) {
      return res.status(400).json({ error: 'Address must contain at least 5 characters' });
    }

    const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true });

    return res.json({
      message: 'Profile updated successfully',
      user: sanitizeUser(user),
    });
  } catch {
    return res.status(500).json({ error: 'Unable to update profile' });
  }
};
