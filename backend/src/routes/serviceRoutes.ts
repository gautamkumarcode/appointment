import { Router } from 'express';
import { serviceController } from '../controllers/serviceController';
import { authenticate, resolveTenant } from '../middleware/auth';

const router = Router();

// All service routes require authentication and tenant resolution
router.use(authenticate, resolveTenant);

// Service CRUD routes
router.post('/', (req, res) => serviceController.createService(req, res));
router.get('/', (req, res) => serviceController.listServices(req, res));
router.get('/:id', (req, res) => serviceController.getService(req, res));
router.put('/:id', (req, res) => serviceController.updateService(req, res));
router.delete('/:id', (req, res) => serviceController.deleteService(req, res));

export default router;
