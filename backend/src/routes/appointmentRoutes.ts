import { Router } from 'express';
import {
  cancelAppointment,
  createAppointment,
  getAppointment,
  getAppointmentByToken,
  getCalendarAppointments,
  listAppointments,
  rescheduleAppointment,
  rescheduleAppointmentByToken,
  updateAppointment,
  updateAppointmentStatus,
} from '../controllers/appointmentController';
import { authenticate } from '../middleware/auth';
import { resolveTenant } from '../middleware/tenant';

const router = Router();

// Protected routes (require authentication)
router.use(authenticate);
router.use(resolveTenant);

// List appointments with filters
router.get('/', listAppointments);

// Get calendar view appointments
router.get('/calendar', getCalendarAppointments);

// Create appointment
router.post('/', createAppointment);

// Get appointment by ID
router.get('/:id', getAppointment);

// Update appointment
router.put('/:id', updateAppointment);

// Update appointment status
router.put('/:id/status', updateAppointmentStatus);

// Cancel appointment
router.delete('/:id', cancelAppointment);

// Reschedule appointment
router.post('/:id/reschedule', rescheduleAppointment);

export default router;

// Public routes (no authentication required) - to be added to a separate public router
export const publicAppointmentRoutes = Router();

// Get appointment by reschedule token
publicAppointmentRoutes.get('/reschedule/:token', getAppointmentByToken);

// Reschedule appointment by token
publicAppointmentRoutes.post('/reschedule/:token', rescheduleAppointmentByToken);
