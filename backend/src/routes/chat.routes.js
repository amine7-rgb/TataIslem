import express from 'express';
import { getAnswer } from '../controllers/chat.controller.js';

const router = express.Router();

router.post('/', getAnswer);

export default router;
