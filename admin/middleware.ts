/**
 * Admin Authentication Middleware
 *
 * Protects admin dashboard routes and verifies admin privileges.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define public routes that don't require authentication
const publicRoutes = ['/login', '/api/auth/login'];

// Define API routes that require authentication
const protectedApiRoutes = ['/api/'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check for authentication token in cookies
  const authToken = request.cookies.get('admin-auth-token')?.value;

  // If no token and trying to access protected route, redirect to login
  if (!authToken) {
    if (pathname.startsWith('/api/')) {
      // For API routes, return 401
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // For page routes, redirect to login
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Verify token and admin status
  try {
    // Note: Token verification should be done server-side
    // This is a simplified version - actual implementation should verify the token
    // using Firebase Admin SDK in an API route
    const response = await fetch(`${request.nextUrl.origin}/api/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
      body: JSON.stringify({ token: authToken }),
    });

    if (!response.ok) {
      throw new Error('Token verification failed');
    }

    const { isAdmin } = await response.json();

    if (!isAdmin) {
      // User is authenticated but not an admin
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Forbidden: Admin access required' },
          { status: 403 }
        );
      }

      // Redirect to unauthorized page
      const url = request.nextUrl.clone();
      url.pathname = '/unauthorized';
      return NextResponse.redirect(url);
    }

    // User is authenticated and is an admin
    return NextResponse.next();
  } catch (error) {
    console.error('Middleware auth error:', error);

    // On error, redirect to login
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
