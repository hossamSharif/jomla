/**
 * Dashboard Layout for Admin
 *
 * Main layout with sidebar navigation for dashboard pages
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Dashboard - Grocery Store',
  description: 'Manage products, offers, and orders',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar Navigation */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-xl font-bold">Grocery Store Admin</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            <a
              href="/products"
              className="block px-4 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"
            >
              Products
            </a>
            <a
              href="/offers"
              className="block px-4 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"
            >
              Offers
            </a>
            <a
              href="/orders"
              className="block px-4 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"
            >
              Orders
            </a>
            <a
              href="/settings"
              className="block px-4 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"
            >
              Settings
            </a>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="pl-64">
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
