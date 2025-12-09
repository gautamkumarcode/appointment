import { Router } from 'express';
import { checkSlot, getAvailableSlots } from '../controllers/availabilityController';
import { authenticate } from '../middleware/auth';
import { resolveTenant } from '../middleware/tenant';

const router = Router();

// Protected routes (require authentication)
router.get('/slots', authenticate, resolveTenant, getAvailableSlots);
router.post('/check', authenticate, resolveTenant, checkSlot);

export default router;
