/**
 * Admin Logout API Route
 * Clears authentication cookie
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Clear the auth token cookie
    const cookieStore = await cookies();
    cookieStore.delete('admin-auth-token');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout API error:', error);
    return NextResponse.json(
      { error: 'Failed to clear authentication cookie' },
      { status: 500 }
    );
  }
}
