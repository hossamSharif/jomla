/**
 * Auth Layout for Admin Dashboard
 *
 * Layout for authentication pages (login)
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login - Admin Dashboard',
  description: 'Login to the admin dashboard',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
