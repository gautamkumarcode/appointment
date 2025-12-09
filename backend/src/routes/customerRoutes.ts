import { Router } from 'express';
import { customerController } from '../controllers/customerController';
import { authenticate, resolveTenant } from '../middleware/auth';

const router = Router();

// All customer routes require authentication and tenant resolution
router.use(authenticate, resolveTenant);

// Customer routes
router.get('/', (req, res) => customerController.listCustomers(req, res));
router.get('/search', (req, res) => customerController.searchCustomers(req, res));
router.get('/:id', (req, res) => customerController.getCustomer(req, res));
router.get('/:id/profile', (req, res) => customerController.getCustomerProfile(req, res));
router.get('/:id/history', (req, res) => customerController.getCustomerHistory(req, res));

export default router;
