import { Request, Response, Router } from 'express';
import { Tenant } from '../models/Tenant';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Get widget configuration for a tenant
 * GET /api/widget/config/:tenantId
 */
router.get('/config/:tenantId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.params;

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      res.status(404).json({
        success: false,
        error: 'Tenant not found',
      });
      return;
    }

    // Return widget configuration
    const widgetConfig = {
      tenantId: tenant._id.toString(),
      businessName: tenant.businessName,
      theme: {
        primaryColor: tenant.primaryColor || '#007bff',
        textColor: '#333333',
      },
      welcomeMessage:
        tenant.chatWelcomeMessage ||
        "Hi! I'm here to help you book an appointment. How can I assist you today?",
      placeholder: 'Type your message...',
      bookingUrl: tenant.bookingUrl || null,
      showBranding: tenant.showWidgetBranding !== false,
    };

    res.json({
      success: true,
      data: widgetConfig,
    });
  } catch (error) {
    logger.error('Error getting widget config:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * Generate embed code for a tenant
 * GET /api/widget/embed/:tenantId
 */
router.get('/embed/:tenantId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.params;
    const { apiUrl } = req.query;

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      res.status(404).json({
        success: false,
        error: 'Tenant not found',
      });
      return;
    }

    const baseUrl = (apiUrl as string) || `${req.protocol}://${req.get('host')}`;

    const welcomeMessage =
      tenant.chatWelcomeMessage ||
      "Hi! I'm here to help you book an appointment. How can I assist you today?";
    const embedCode = `<!-- AI Chat Widget -->
<script>
  window.ChatWidgetConfig = {
    tenantId: '${tenantId}',
    apiUrl: '${baseUrl}/api',
    theme: {
      primaryColor: '${tenant.primaryColor || '#007bff'}',
      textColor: '#333333'
    },
    welcomeMessage: "${welcomeMessage.replace(/"/g, '\\"')}",
    placeholder: 'Type your message...',
    position: 'bottom-right',
    showBranding: ${tenant.showWidgetBranding !== false},
    bookingUrl: ${tenant.bookingUrl ? `'${tenant.bookingUrl}'` : 'null'}
  };
</script>
<script src="${baseUrl}/chat-widget.js"></script>`;

    res.json({
      success: true,
      data: {
        embedCode,
        directLink: `${baseUrl}/widget?tenantId=${tenantId}&primaryColor=${encodeURIComponent(tenant.primaryColor || '#007bff')}&welcomeMessage=${encodeURIComponent(welcomeMessage)}&showBranding=${tenant.showWidgetBranding !== false}${tenant.bookingUrl ? `&bookingUrl=${encodeURIComponent(tenant.bookingUrl)}` : ''}`,
      },
    });
  } catch (error) {
    logger.error('Error generating embed code:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * Get widget configuration by domain
 * POST /api/widget/config-by-domain
 */
router.post('/config-by-domain', async (req: Request, res: Response): Promise<void> => {
  try {
    const { websiteUrl, currentUrl } = req.body;

    logger.info('Widget config-by-domain request:', { websiteUrl, currentUrl });

    if (!websiteUrl) {
      res.status(400).json({
        success: false,
        error: 'Website URL is required',
      });
      return;
    }

    // Clean up the website URL for matching
    const cleanUrl = websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');

    // Find tenant by allowed domains
    const tenant = await Tenant.findOne({
      $or: [
        { allowedDomains: { $in: [websiteUrl] } },
        { allowedDomains: { $in: [cleanUrl] } },
        {
          allowedDomains: {
            $regex: new RegExp(cleanUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
          },
        },
      ],
    });

    if (!tenant) {
      res.status(404).json({
        success: false,
        error: `No tenant found for domain "${cleanUrl}". Please make sure you've registered this domain in your widget generator settings.`,
      });
      return;
    }

    // Return widget configuration
    const widgetConfig = {
      tenantId: tenant._id.toString(),
      businessName: tenant.businessName,
      theme: {
        primaryColor: tenant.primaryColor || '#007bff',
        textColor: '#333333',
      },
      welcomeMessage:
        tenant.chatWelcomeMessage ||
        "Hi! I'm here to help you book an appointment. How can I assist you today?",
      placeholder: 'Type your message...',
      bookingUrl: tenant.bookingUrl || null,
      showBranding: tenant.showWidgetBranding !== false,
    };

    // Log the widget access for analytics
    logger.info('Widget accessed by domain', {
      tenantId: tenant._id,
      websiteUrl,
      currentUrl,
      timestamp: new Date(),
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });

    res.json({
      success: true,
      data: widgetConfig,
    });
  } catch (error) {
    logger.error('Error getting widget config by domain:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * Track widget usage analytics
 * POST /api/widget/analytics/:tenantId
 */
router.post('/analytics/:tenantId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.params;
    const { event, data } = req.body;

    // Validate tenant exists
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      res.status(404).json({
        success: false,
        error: 'Tenant not found',
      });
      return;
    }

    // Log analytics event (you can extend this to save to database)
    logger.info('Widget analytics event', {
      tenantId,
      event,
      data,
      timestamp: new Date(),
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });

    res.json({
      success: true,
      message: 'Analytics event recorded',
    });
  } catch (error) {
    logger.error('Error recording widget analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;
