import express from 'express';
import {
  getAccountOverview,
  saveOwnReview,
  selectServiceAlternative,
  updateProfile,
} from '../controllers/account.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.get('/overview', getAccountOverview);
router.post('/review', saveOwnReview);
router.patch('/service-orders/:orderId/select-slot', selectServiceAlternative);
router.patch('/profile', updateProfile);

export default router;
