import { Router } from 'express';
import { tenantController } from '../controllers/tenantController';
import { authenticate, resolveTenant } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/register', (req, res) => tenantController.register(req, res));
router.get('/slug/:slug', (req, res) => tenantController.getTenantBySlug(req, res));

// Protected routes
router.get('/me', authenticate, resolveTenant, (req, res) =>
  tenantController.getCurrentTenant(req, res)
);
router.put('/me', authenticate, resolveTenant, (req, res) =>
  tenantController.updateTenant(req, res)
);

export default router;
