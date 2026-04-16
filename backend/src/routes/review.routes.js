import express from 'express';
import { getPublicReviews } from '../controllers/review.controller.js';

const router = express.Router();

router.get('/', getPublicReviews);

export default router;
