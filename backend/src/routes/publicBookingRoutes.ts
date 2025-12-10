import { Router } from 'express';
import { getPublicAvailableSlots } from '../controllers/availabilityController';
import {
  createPublicBooking,
  getPublicAppointment,
  getPublicServices,
  getTenantInfo,
  resolveTenantBySlug,
} from '../controllers/publicBookingController';

const router = Router();

// Middleware to resolve tenant by slug for all public routes
router.use('/:tenantSlug/*', resolveTenantBySlug);

// Public booking endpoints (no authentication required)

// GET /api/public/:tenantSlug/info - Get tenant branding info
router.get('/:tenantSlug/info', getTenantInfo);

// GET /api/public/:tenantSlug/services - List tenant services
router.get('/:tenantSlug/services', getPublicServices);

// GET /api/public/:tenantSlug/availability - Get available slots
router.get('/:tenantSlug/availability', getPublicAvailableSlots);

// POST /api/public/:tenantSlug/book - Create booking
router.post('/:tenantSlug/book', createPublicBooking);

// GET /api/public/:tenantSlug/appointment/:id - Get appointment with token
router.get('/:tenantSlug/appointment/:id', getPublicAppointment);

export default router;
