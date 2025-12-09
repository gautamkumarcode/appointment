import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import { connectDatabase } from './config/database';
import appointmentRoutes, { publicAppointmentRoutes } from './routes/appointmentRoutes';
import authRoutes from './routes/authRoutes';
import availabilityRoutes from './routes/availabilityRoutes';
import customerRoutes from './routes/customerRoutes';
import paymentRoutes, { webhookRouter } from './routes/paymentRoutes';
import serviceRoutes from './routes/serviceRoutes';
import staffRoutes from './routes/staffRoutes';
import tenantRoutes from './routes/tenantRoutes';
import { logger } from './utils/logger';
import cronScheduler from './workers/cronScheduler';
import './workers/followUpWorker'; // Import to start the worker
import './workers/reminderWorker'; // Import to start the worker

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4500;

// Middleware
app.use(helmet());
app.use(cors());

// Webhook routes need raw body - register before express.json()
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }), webhookRouter);

// Regular JSON parsing for other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/payments', paymentRoutes);

// Public routes (no authentication required)
app.use('/api/public/appointments', publicAppointmentRoutes);

// Start server function
export const startServer = async () => {
  try {
    await connectDatabase();
    logger.info('Database connected successfully');

    // Start cron scheduler for background jobs
    cronScheduler.start();
    logger.info('Background job scheduler started');

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  cronScheduler.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  cronScheduler.stop();
  process.exit(0);
});

// Only start server if this file is run directly
if (require.main === module) {
  startServer();
}

export default app;
