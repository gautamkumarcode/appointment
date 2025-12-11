import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { websiteUrl, currentUrl } = await request.json();

    console.log('Frontend API: Received request with websiteUrl:', websiteUrl);

    if (!websiteUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'Website URL is required',
        },
        { status: 400 }
      );
    }

    // Forward the request to the backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4500/api';
    const fullUrl = `${backendUrl}/widget/config-by-domain`;

    console.log('Frontend API: Forwarding to backend URL:', fullUrl);

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        websiteUrl,
        currentUrl,
      }),
    });

    const data = await response.json();

    console.log('Frontend API: Backend response status:', response.status);
    console.log('Frontend API: Backend response data:', data);

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in config-by-domain API route:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
