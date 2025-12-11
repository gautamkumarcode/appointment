import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import session from 'express-session';
import fs from 'fs';
import helmet from 'helmet';
import path from 'path';
import { connectDatabase } from './config/database';
import aiRoutes from './routes/aiRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import appointmentRoutes, { publicAppointmentRoutes } from './routes/appointmentRoutes';
import authRoutes from './routes/authRoutes';
import availabilityRoutes from './routes/availabilityRoutes';
import customerRoutes from './routes/customerRoutes';
import paymentRoutes, { webhookRouter } from './routes/paymentRoutes';
import publicBookingRoutes from './routes/publicBookingRoutes';
import serviceRoutes from './routes/serviceRoutes';
import staffRoutes from './routes/staffRoutes';
import tenantRoutes from './routes/tenantRoutes';
import widgetRoutes from './routes/widgetRoutes';
import { logger } from './utils/logger';
import cronScheduler from './workers/cronScheduler';
import './workers/followUpWorker'; // Import to start the worker
import './workers/reminderWorker'; // Import to start the worker
const FileStore = require('session-file-store');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4500;

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000' || 'http://192.168.1.13:3000',

    credentials: true, // Allow cookies
  })
);
app.use(cookieParser());

// Webhook routes need raw body - register before express.json()
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }), webhookRouter);

// Regular JSON parsing for other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create session store
const SessionFileStore = FileStore(session);
const sessionStore = new SessionFileStore({
  path: path.join(__dirname, '../sessions'),
  ttl: 7 * 24 * 60 * 60, // 7 days in seconds
  retries: 0,
});

// Session configuration with file store for persistence
app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: false,
    name: 'connect.sid', // Use default name for compatibility
    cookie: {
      secure: false, // Set to false for development (HTTP)
      httpOnly: true, // Prevent XSS
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days for better UX
      sameSite: 'lax', // CSRF protection
    },
    rolling: true, // Reset expiration on each request
  })
);

// Session debugging middleware
app.use((req, res, next) => {
  if (req.path.includes('/auth/') || req.path.includes('/api/')) {
    console.log('🔍 Session Debug:', {
      sessionID: req.sessionID,
      userId: req.session.userId,
      tenantId: req.session.tenantId,
      path: req.path,
      method: req.method,
      hasSession: !!req.session,
      cookieMaxAge: req.session.cookie?.maxAge,
      sessionAge: req.session.cookie ? Date.now() - (req.session.cookie.maxAge || 0) : 'N/A',
    });
  }
  next();
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
const logosDir = path.join(uploadsDir, 'logos');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(logosDir)) {
  fs.mkdirSync(logosDir, { recursive: true });
}

// Serve static files
app.use('/uploads', express.static(uploadsDir));

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
app.use('/api/analytics', analyticsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/widget', widgetRoutes);

// Public routes (no authentication required)
app.use('/api/public/appointments', publicAppointmentRoutes);
app.use('/api/public', publicBookingRoutes);

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
