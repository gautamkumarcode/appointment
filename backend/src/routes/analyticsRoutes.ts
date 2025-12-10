import { Router } from 'express';
import {
  getBookingAnalytics,
  getCustomerAnalytics,
  getDetailedAnalytics,
  getMonthlyAnalytics,
  getNoShowCount,
  getRepeatCustomerCount,
  getTotalBookings,
  getTotalRevenue,
} from '../controllers/analyticsController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Analytics endpoints
router.get('/', getBookingAnalytics); // GET /api/analytics - Get basic analytics
router.get('/detailed', getDetailedAnalytics); // GET /api/analytics/detailed - Get detailed analytics
router.get('/bookings', getTotalBookings); // GET /api/analytics/bookings - Get total bookings
router.get('/revenue', getTotalRevenue); // GET /api/analytics/revenue - Get total revenue
router.get('/no-shows', getNoShowCount); // GET /api/analytics/no-shows - Get no-show count
router.get('/customers', getCustomerAnalytics); // GET /api/analytics/customers - Get customer analytics
router.get('/customers/repeat', getRepeatCustomerCount); // GET /api/analytics/customers/repeat - Get repeat customer count
router.get('/monthly', getMonthlyAnalytics); // GET /api/analytics/monthly - Get monthly analytics

export default router;
