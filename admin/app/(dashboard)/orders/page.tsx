'use client';

/**
 * Orders List Page
 *
 * Display all orders with filtering, search, and management actions
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, query, orderBy, onSnapshot, Timestamp, where } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { Order } from '@shared/types/order';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | Order['status']>('all');
  const [fulfillmentFilter, setFulfillmentFilter] = useState<'all' | 'delivery' | 'pickup'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  useEffect(() => {
    // Subscribe to orders collection
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const ordersData: Order[] = [];
        snapshot.forEach((doc) => {
          ordersData.push({ id: doc.id, ...doc.data() } as Order);
        });
        setOrders(ordersData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching orders:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filter orders based on criteria
  const filteredOrders = orders.filter((order) => {
    // Status filter
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    // Fulfillment filter
    const matchesFulfillment =
      fulfillmentFilter === 'all' || order.fulfillmentMethod === fulfillmentFilter;

    // Search filter
    const matchesSearch =
      searchTerm === '' ||
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase());

    // Date filter
    let matchesDate = true;
    if (dateFilter !== 'all' && order.createdAt) {
      const orderDate = order.createdAt.toDate();
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (dateFilter === 'today') {
        matchesDate = orderDate >= today;
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesDate = orderDate >= weekAgo;
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        matchesDate = orderDate >= monthAgo;
      }
    }

    return matchesStatus && matchesFulfillment && matchesSearch && matchesDate;
  });

  // Calculate metrics
  const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.total, 0);
  const pendingOrders = filteredOrders.filter((o) => o.status === 'pending').length;
  const todayOrders = orders.filter((order) => {
    if (!order.createdAt) return false;
    const orderDate = order.createdAt.toDate();
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return orderDate >= todayStart;
  }).length;

  // Format price in cents to dollars
  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  // Format timestamp
  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  };

  // Get status badge color
  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'preparing':
        return 'bg-purple-100 text-purple-800';
      case 'out_for_delivery':
        return 'bg-indigo-100 text-indigo-800';
      case 'ready_for_pickup':
        return 'bg-cyan-100 text-cyan-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format status for display
  const formatStatus = (status: Order['status']) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-600 mt-1">Manage customer orders and fulfillment</p>
        </div>
      </div>

      {/* Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Total Orders</div>
          <div className="text-2xl font-bold text-gray-900 mt-2">{orders.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Today's Orders</div>
          <div className="text-2xl font-bold text-gray-900 mt-2">{todayOrders}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Pending Orders</div>
          <div className="text-2xl font-bold text-yellow-600 mt-2">{pendingOrders}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Total Revenue</div>
          <div className="text-2xl font-bold text-green-600 mt-2">{formatPrice(totalRevenue)}</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="space-y-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by order number, customer name, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filters Row */}
          <div className="flex gap-4 flex-wrap items-center">
            {/* Status Filter */}
            <div className="flex gap-2">
              <span className="text-sm font-medium text-gray-700 self-center mr-2">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="preparing">Preparing</option>
                <option value="out_for_delivery">Out for Delivery</option>
                <option value="ready_for_pickup">Ready for Pickup</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Fulfillment Filter */}
            <div className="flex gap-2">
              <span className="text-sm font-medium text-gray-700 self-center mr-2">
                Fulfillment:
              </span>
              {(['all', 'delivery', 'pickup'] as const).map((method) => (
                <button
                  key={method}
                  onClick={() => setFulfillmentFilter(method)}
                  className={`px-3 py-1 rounded-md text-sm font-medium capitalize ${
                    fulfillmentFilter === method
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>

            {/* Date Filter */}
            <div className="flex gap-2">
              <span className="text-sm font-medium text-gray-700 self-center mr-2">Date:</span>
              {(['all', 'today', 'week', 'month'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setDateFilter(period)}
                  className={`px-3 py-1 rounded-md text-sm font-medium capitalize ${
                    dateFilter === period
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : period}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mt-3 text-sm text-gray-600">
          Showing {filteredOrders.length} of {orders.length} orders
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fulfillment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm ||
                    statusFilter !== 'all' ||
                    fulfillmentFilter !== 'all' ||
                    dateFilter !== 'all'
                      ? 'No orders match your filters'
                      : 'No orders yet. Orders will appear here when customers place them.'}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{order.orderNumber}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{order.customerName}</div>
                      <div className="text-sm text-gray-500">{order.customerEmail}</div>
                      <div className="text-sm text-gray-500">{order.customerPhone}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {order.offers.length + order.products.length} item
                      {order.offers.length + order.products.length !== 1 ? 's' : ''}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {formatPrice(order.total)}
                      </div>
                      {order.totalSavings > 0 && (
                        <div className="text-xs text-green-600">
                          Saved {formatPrice(order.totalSavings)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 capitalize">
                        {order.fulfillmentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {formatStatus(order.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <Link href={`/orders/${order.id}`} className="text-blue-600 hover:text-blue-900">
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
