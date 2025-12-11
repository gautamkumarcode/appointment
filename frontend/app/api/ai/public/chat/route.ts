import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Get the tenant ID from the request headers
    const tenantId = request.headers.get('x-tenant-id');

    console.log('Frontend AI API: Processing chat request for tenant:', tenantId);

    if (!tenantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tenant ID is required in X-Tenant-ID header',
        },
        { status: 400 }
      );
    }

    // Forward the request to the backend with all necessary headers
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4500/api';
    const response = await fetch(`${backendUrl}/ai/public/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    console.log('Frontend AI API: Backend response status:', response.status);

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in AI public chat API route:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
