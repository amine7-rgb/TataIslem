import express from 'express';
import dotenv from 'dotenv';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';

import reservationRoutes from './routes/reservation.routes.js';
import contactRoutes from './routes/contact.routes.js';
import chatRoutes from './routes/chat.routes.js';
import eventRoutes from './routes/event.routes.js';
import stripeRoutes from './routes/stripe.routes.js';
import serviceRoutes from './routes/service.routes.js';
import authRoutes from './routes/auth.routes.js';
import accountRoutes from './routes/account.routes.js';
import adminRoutes from './routes/admin.routes.js';
import reviewRoutes from './routes/review.routes.js';

import { securityMiddleware } from './middleware/security.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import { startReminderJob } from './jobs/reminder.job.js';

dotenv.config();
const app = express();

app.set('trust proxy', 1);

connectDB();
securityMiddleware(app);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.use('/api/stripe', stripeRoutes);

app.use(express.json({ limit: '2mb' }));

app.use(
  '/api/uploads',
  express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res) => {
      res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  }),
);

app.use('/api/auth', authRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/reviews', reviewRoutes);

startReminderJob();

const reactBuildPath = path.join(__dirname, 'client', 'build');
app.use(express.static(reactBuildPath));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return notFound(req, res);
  res.sendFile(path.join(reactBuildPath, 'index.html'));
});

app.use(notFound);
app.use(errorHandler);

export default app;
