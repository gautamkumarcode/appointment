import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = (await cookieStore).get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { domain } = await request.json();

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
    }

    // Register domain with backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4500/api';
    const response = await fetch(`${backendUrl}/tenants/register-domain`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ domain }),
    });

    if (!response.ok) {
      throw new Error('Failed to register domain');
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error registering domain:', error);
    return NextResponse.json({ error: 'Failed to register domain' }, { status: 500 });
  }
}
