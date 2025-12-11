import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = (await cookieStore).get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get tenant info from backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4500/api';
    const response = await fetch(`${backendUrl}/tenants/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch tenant information');
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to get tenant information');
    }

    return NextResponse.json({
      success: true,
      id: data.data._id || data.data.id,
      _id: data.data._id,
      businessName: data.data.businessName,
      email: data.data.email,
    });
  } catch (error) {
    console.error('Error fetching current tenant:', error);
    return NextResponse.json({ error: 'Failed to fetch tenant information' }, { status: 500 });
  }
}
