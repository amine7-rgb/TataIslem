import express from 'express';
import { checkoutReservation } from '../controllers/reservation.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/checkout', requireAuth, checkoutReservation);

export default router;
