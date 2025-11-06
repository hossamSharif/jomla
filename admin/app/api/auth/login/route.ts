/**
 * Admin Login API Route
 * Sets authentication cookie after successful login
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json(
        { error: 'ID token is required' },
        { status: 400 }
      );
    }

    // Set the auth token as an HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set('admin-auth-token', idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { error: 'Failed to set authentication cookie' },
      { status: 500 }
    );
  }
}
