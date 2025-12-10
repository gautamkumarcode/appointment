import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/register', (req, res) => authController.register(req, res));
router.post('/login', (req, res) => authController.login(req, res));

// Protected routes
router.get('/me', authenticate, (req, res) => authController.me(req, res));
router.post('/logout', authenticate, (req, res) => authController.logout(req, res));

export default router;
