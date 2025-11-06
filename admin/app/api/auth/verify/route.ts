/**
 * Admin Token Verification API Route
 * Verifies Firebase ID token and checks admin claims
 */

import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required', isAdmin: false },
        { status: 400 }
      );
    }

    // Verify the ID token
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Check if user has admin claim
    const isAdmin = decodedToken.admin === true;

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin privileges required', isAdmin: false },
        { status: 403 }
      );
    }

    return NextResponse.json({
      isAdmin: true,
      uid: decodedToken.uid,
      email: decodedToken.email,
    });
  } catch (error: any) {
    console.error('Token verification error:', error);

    // Handle specific Firebase errors
    if (error.code === 'auth/id-token-expired') {
      return NextResponse.json(
        { error: 'Token expired', isAdmin: false },
        { status: 401 }
      );
    } else if (error.code === 'auth/argument-error') {
      return NextResponse.json(
        { error: 'Invalid token format', isAdmin: false },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Token verification failed', isAdmin: false },
      { status: 401 }
    );
  }
}
