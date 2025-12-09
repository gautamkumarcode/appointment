import { Router } from 'express';
import { staffController } from '../controllers/staffController';
import { authenticate, resolveTenant } from '../middleware/auth';

const router = Router();

// All staff routes require authentication and tenant resolution
router.use(authenticate, resolveTenant);

// Staff CRUD routes
router.post('/', (req, res) => staffController.createStaff(req, res));
router.get('/', (req, res) => staffController.listStaff(req, res));
router.get('/:id', (req, res) => staffController.getStaff(req, res));
router.put('/:id', (req, res) => staffController.updateStaff(req, res));
router.delete('/:id', (req, res) => staffController.deleteStaff(req, res));

// Staff availability management
router.put('/:id/availability', (req, res) => staffController.updateAvailability(req, res));

// Staff holiday management
router.post('/:id/holidays', (req, res) => staffController.addHoliday(req, res));
router.get('/:id/holidays', (req, res) => staffController.getHolidays(req, res));
router.delete('/:id/holidays/:holidayId', (req, res) => staffController.deleteHoliday(req, res));

export default router;
