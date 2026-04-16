import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { getAllowedOrigins } from '../config/clientOrigins.js';

export const securityMiddleware = (app) => {
  app.use(helmet());

  const allowedOrigins = getAllowedOrigins();

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    }),
  );

  app.use(
    '/api/auth/login',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 8,
      message: 'Too many login attempts, try again later',
    }),
  );

  app.use(
    '/api/auth/register',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 6,
      message: 'Too many registration attempts, try again later',
    }),
  );

  app.use(
    '/api/auth/resend-verification',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 5,
      message: 'Too many verification requests, try again later',
    }),
  );

  app.use(
    '/api/auth/forgot-password',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 5,
      message: 'Too many password reset requests, try again later',
    }),
  );

  app.use(
    '/api/auth/reset-password',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 8,
      message: 'Too many password reset attempts, try again later',
    }),
  );

  app.use(
    '/api/reservations/checkout',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 10,
      message: 'Too many requests, try again later',
    }),
  );

  app.use(
    '/api/services/checkout',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 10,
      message: 'Too many requests, try again later',
    }),
  );
};
