import express from 'express';
import {
  checkoutService,
  createService,
  deleteService,
  getServices,
  updateService,
} from '../controllers/service.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getServices);
router.post('/', requireAuth, requireRole('admin'), createService);
router.patch('/:id', requireAuth, requireRole('admin'), updateService);
router.delete('/:id', requireAuth, requireRole('admin'), deleteService);
router.post('/checkout', requireAuth, checkoutService);

export default router;
