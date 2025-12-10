import { Router } from 'express';
import {
  getChatWidgetConfig,
  handleChatMessage,
  handleInstagramWebhook,
  handleMessengerWebhook,
  handlePublicChatMessage,
  handleWhatsAppWebhook,
} from '../controllers/aiController';
import { authenticate } from '../middleware/auth';
import { resolveTenant } from '../middleware/tenant';

const router = Router();

// Chat API endpoints (require authentication)
router.post('/chat', authenticate, resolveTenant, handleChatMessage);
router.get('/widget/config', authenticate, resolveTenant, getChatWidgetConfig);

// Public chat endpoints (no authentication required for embeddable widget)
router.post('/public/chat', handlePublicChatMessage);
router.get('/public/widget/config', getChatWidgetConfig);

// Webhook endpoints (no authentication required)
router.all('/webhook/whatsapp', handleWhatsAppWebhook);
router.all('/webhook/messenger', handleMessengerWebhook);
router.all('/webhook/instagram', handleInstagramWebhook);

export default router;
