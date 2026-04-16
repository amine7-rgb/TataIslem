import express from 'express';
import {
  confirmServiceSchedule,
  declineServiceSchedule,
  exportAdminBookings,
  getAdminBookings,
  getAdminOverview,
  proposeServiceAlternatives,
  updateAdminAvailability,
} from '../controllers/admin.controller.js';
import { deleteReview, getAdminReviews } from '../controllers/review.controller.js';
import {
  disconnectGoogleCalendar,
  handleGoogleCalendarCallback,
  startGoogleCalendarConnect,
} from '../controllers/googleCalendar.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth, requireRole('admin'));

router.get('/overview', getAdminOverview);
router.get('/bookings', getAdminBookings);
router.get('/bookings/export', exportAdminBookings);
router.get('/reviews', getAdminReviews);
router.get('/google/connect', startGoogleCalendarConnect);
router.get('/google/callback', handleGoogleCalendarCallback);
router.delete('/google/disconnect', disconnectGoogleCalendar);
router.delete('/reviews/:reviewId', deleteReview);
router.patch('/availability', updateAdminAvailability);
router.patch('/service-orders/:orderId/confirm', confirmServiceSchedule);
router.patch('/service-orders/:orderId/decline', declineServiceSchedule);
router.patch('/service-orders/:orderId/propose-alternatives', proposeServiceAlternatives);

export default router;
