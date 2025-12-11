import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');
  const format = searchParams.get('format') || 'json';

  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId parameter is required' }, { status: 400 });
  }

  try {
    // Fetch tenant configuration from your backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4500/api';
    const response = await fetch(`${backendUrl}/widget/config/${tenantId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch tenant configuration');
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to get widget configuration');
    }

    const config = data.data;
    const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';

    if (format === 'embed') {
      // Return HTML embed code
      const embedCode = `<!-- AI Chat Widget -->
<script>
  window.ChatWidgetConfig = {
    tenantId: '${config.tenantId}',
    apiUrl: '${backendUrl}',
    theme: {
      primaryColor: '${config.theme.primaryColor}',
      textColor: '${config.theme.textColor}'
    },
    welcomeMessage: "${config.welcomeMessage.replace(/"/g, '\\"')}",
    placeholder: '${config.placeholder}',
    position: 'bottom-right',
    showBranding: ${config.showBranding},
    bookingUrl: ${config.bookingUrl ? `'${config.bookingUrl}'` : 'null'},
    enableAnalytics: true,
    autoOpen: false,
    openDelay: 0
  };
</script>
<script src="${baseUrl}/chat-widget.js"></script>`;

      return new NextResponse(embedCode, {
        headers: {
          'Content-Type': 'text/html',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    if (format === 'js') {
      // Return JavaScript configuration
      const jsConfig = `window.ChatWidgetConfig = ${JSON.stringify(
        {
          tenantId: config.tenantId,
          apiUrl: backendUrl,
          theme: config.theme,
          welcomeMessage: config.welcomeMessage,
          placeholder: config.placeholder,
          position: 'bottom-right',
          showBranding: config.showBranding,
          bookingUrl: config.bookingUrl,
          enableAnalytics: true,
          autoOpen: false,
          openDelay: 0,
        },
        null,
        2
      )};`;

      return new NextResponse(jsConfig, {
        headers: {
          'Content-Type': 'application/javascript',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Return JSON configuration
    return NextResponse.json({
      success: true,
      data: {
        ...config,
        embedCode: `<script>window.ChatWidgetConfig=${JSON.stringify({
          tenantId: config.tenantId,
          apiUrl: backendUrl,
          theme: config.theme,
          welcomeMessage: config.welcomeMessage,
          placeholder: config.placeholder,
          position: 'bottom-right',
          showBranding: config.showBranding,
          bookingUrl: config.bookingUrl,
          enableAnalytics: true,
        })};</script><script src="${baseUrl}/chat-widget.js"></script>`,
        directLink: `${baseUrl}/widget?tenantId=${config.tenantId}&primaryColor=${encodeURIComponent(config.theme.primaryColor)}&welcomeMessage=${encodeURIComponent(config.welcomeMessage)}&showBranding=${config.showBranding}${config.bookingUrl ? `&bookingUrl=${encodeURIComponent(config.bookingUrl)}` : ''}`,
        iframeCode: `<iframe src="${baseUrl}/widget?tenantId=${config.tenantId}&primaryColor=${encodeURIComponent(config.theme.primaryColor)}&welcomeMessage=${encodeURIComponent(config.welcomeMessage)}&showBranding=${config.showBranding}${config.bookingUrl ? `&bookingUrl=${encodeURIComponent(config.bookingUrl)}` : ''}" width="100%" height="600" frameborder="0" style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"></iframe>`,
      },
    });
  } catch (error) {
    console.error('Error fetching widget configuration:', error);
    return NextResponse.json({ error: 'Failed to fetch widget configuration' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
