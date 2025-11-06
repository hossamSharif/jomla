'use client';

/**
 * Order Details Page
 *
 * Display full order breakdown with status management
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, onSnapshot, Timestamp, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { Order, OrderStatus } from '@shared/types/order';

// Status transition map
const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['out_for_delivery', 'ready_for_pickup', 'cancelled'],
  out_for_delivery: ['completed', 'cancelled'],
  ready_for_pickup: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    // Subscribe to order document
    const unsubscribe = onSnapshot(
      doc(db, 'orders', orderId),
      (snapshot) => {
        if (snapshot.exists()) {
          setOrder({ id: snapshot.id, ...snapshot.data() } as Order);
        } else {
          setOrder(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching order:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [orderId]);

  // Update order status
  const updateOrderStatus = async (newStatus: OrderStatus) => {
    if (!order) return;

    setUpdatingStatus(true);
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: newStatus,
        statusHistory: arrayUnion({
          status: newStatus,
          timestamp: Timestamp.now(),
        }),
        updatedAt: Timestamp.now(),
        ...(newStatus === 'completed' && { completedAt: Timestamp.now() }),
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status. Please try again.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Cancel order
  const cancelOrder = async () => {
    if (!order) return;

    setCancelling(true);
    try {
      await updateOrderStatus('cancelled');
      setShowCancelConfirm(false);
    } catch (error) {
      console.error('Error cancelling order:', error);
      alert('Failed to cancel order. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  // Get available status transitions
  const getAvailableStatuses = (currentStatus: OrderStatus): OrderStatus[] => {
    // Filter based on fulfillment method
    const transitions = STATUS_TRANSITIONS[currentStatus] || [];
    if (!order) return transitions;

    return transitions.filter((status) => {
      if (status === 'out_for_delivery' && order.fulfillmentMethod !== 'delivery') return false;
      if (status === 'ready_for_pickup' && order.fulfillmentMethod !== 'pickup') return false;
      return true;
    });
  };

  // Format price in cents to dollars
  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  // Format timestamp
  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  };

  // Format short date
  const formatShortDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  };

  // Get status badge color
  const getStatusColor = (status: OrderStatus) => {
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
  const formatStatus = (status: OrderStatus) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h2>
        <p className="text-gray-600 mb-6">The order you're looking for doesn't exist.</p>
        <Link href="/orders" className="text-blue-600 hover:text-blue-800">
          ← Back to Orders
        </Link>
      </div>
    );
  }

  const availableStatuses = getAvailableStatuses(order.status);
  const canCancel = order.status === 'pending' && !showCancelConfirm;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link href="/orders" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← Back to Orders
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Order {order.orderNumber}</h1>
            <p className="text-gray-600 mt-1">Placed on {formatDate(order.createdAt)}</p>
          </div>
          <div className="flex gap-3 items-center">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}>
              {formatStatus(order.status)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Order Items</h2>
            </div>
            <div className="p-6 space-y-6">
              {/* Offers */}
              {order.offers.map((offer, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{offer.offerName}</h3>
                      <p className="text-sm text-gray-600">Quantity: {offer.quantity}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        {formatPrice(offer.discountedTotal)}
                      </div>
                      <div className="text-sm text-gray-500 line-through">
                        {formatPrice(offer.originalTotal)}
                      </div>
                      <div className="text-sm text-green-600">
                        Save {formatPrice(offer.originalTotal - offer.discountedTotal)}
                      </div>
                    </div>
                  </div>

                  {/* Bundled Products */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                      Bundled Products:
                    </p>
                    <div className="space-y-2">
                      {offer.products.map((product, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-gray-700">{product.productName}</span>
                          <div className="text-right">
                            <span className="text-gray-900 font-medium">
                              {formatPrice(product.discountedPrice)}
                            </span>
                            <span className="text-gray-400 line-through ml-2 text-xs">
                              {formatPrice(product.basePrice)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {/* Individual Products */}
              {order.products.map((product, index) => (
                <div key={index} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
                  <div>
                    <h3 className="font-medium text-gray-900">{product.productName}</h3>
                    <p className="text-sm text-gray-600">
                      Quantity: {product.quantity} × {formatPrice(product.pricePerUnit)}
                    </p>
                  </div>
                  <div className="font-semibold text-gray-900">
                    {formatPrice(product.totalPrice)}
                  </div>
                </div>
              ))}

              {/* Order Summary */}
              <div className="pt-4 border-t border-gray-200 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900">{formatPrice(order.subtotal)}</span>
                </div>
                {order.totalSavings > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Savings</span>
                    <span className="text-green-600">-{formatPrice(order.totalSavings)}</span>
                  </div>
                )}
                {order.deliveryFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Delivery Fee</span>
                    <span className="text-gray-900">{formatPrice(order.deliveryFee)}</span>
                  </div>
                )}
                {order.tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax</span>
                    <span className="text-gray-900">{formatPrice(order.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                  <span className="text-gray-900">Total</span>
                  <span className="text-gray-900">{formatPrice(order.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Fulfillment Details */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {order.fulfillmentMethod === 'delivery' ? 'Delivery Details' : 'Pickup Details'}
              </h2>
            </div>
            <div className="p-6">
              {order.fulfillmentMethod === 'delivery' && order.deliveryDetails && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Address</label>
                    <p className="text-gray-900">{order.deliveryDetails.address}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">City</label>
                      <p className="text-gray-900">{order.deliveryDetails.city}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Postal Code</label>
                      <p className="text-gray-900">{order.deliveryDetails.postalCode}</p>
                    </div>
                  </div>
                  {order.deliveryDetails.notes && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Delivery Notes</label>
                      <p className="text-gray-900">{order.deliveryDetails.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {order.fulfillmentMethod === 'pickup' && order.pickupDetails && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Pickup Location</label>
                    <p className="text-gray-900">{order.pickupDetails.pickupLocation}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Requested Pickup Time</label>
                    <p className="text-gray-900">{formatDate(order.pickupDetails.pickupTime)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status History Timeline */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Status History</h2>
            </div>
            <div className="p-6">
              <div className="flow-root">
                <ul className="-mb-8">
                  {order.statusHistory.map((history, index) => (
                    <li key={index}>
                      <div className="relative pb-8">
                        {index !== order.statusHistory.length - 1 && (
                          <span
                            className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                            aria-hidden="true"
                          />
                        )}
                        <div className="relative flex space-x-3">
                          <div>
                            <span
                              className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                                getStatusColor(history.status).split(' ')[0]
                              }`}
                            >
                              <svg
                                className="h-5 w-5 text-current"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </span>
                          </div>
                          <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {formatStatus(history.status)}
                              </p>
                            </div>
                            <div className="whitespace-nowrap text-right text-sm text-gray-500">
                              {formatShortDate(history.timestamp)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Information */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Customer Information</h2>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="text-gray-900">{order.customerName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="text-gray-900">{order.customerEmail}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Phone</label>
                <p className="text-gray-900">{order.customerPhone}</p>
              </div>
            </div>
          </div>

          {/* Invoice */}
          {order.invoiceUrl && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Invoice</h2>
              </div>
              <div className="p-6">
                <a
                  href={order.invoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <svg
                    className="h-5 w-5 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Download Invoice
                </a>
              </div>
            </div>
          )}

          {/* Status Management */}
          {availableStatuses.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Update Status</h2>
              </div>
              <div className="p-6 space-y-3">
                <p className="text-sm text-gray-600 mb-4">
                  Current status: <span className="font-semibold">{formatStatus(order.status)}</span>
                </p>
                {availableStatuses.map((status) => (
                  <button
                    key={status}
                    onClick={() => updateOrderStatus(status)}
                    disabled={updatingStatus}
                    className={`w-full px-4 py-2 rounded-md font-medium ${
                      status === 'cancelled'
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {updatingStatus ? 'Updating...' : `Mark as ${formatStatus(status)}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cancel Order */}
          {canCancel && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Cancel Order</h2>
              </div>
              <div className="p-6">
                <p className="text-sm text-gray-600 mb-4">
                  Cancel this order if the customer requested cancellation or if there's an issue
                  with fulfillment.
                </p>
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
                >
                  Cancel Order
                </button>
              </div>
            </div>
          )}

          {/* Cancel Confirmation */}
          {showCancelConfirm && (
            <div className="bg-red-50 border border-red-200 rounded-lg shadow">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-red-900 mb-2">Confirm Cancellation</h3>
                <p className="text-sm text-red-700 mb-4">
                  Are you sure you want to cancel this order? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={cancelOrder}
                    disabled={cancelling}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium disabled:opacity-50"
                  >
                    {cancelling ? 'Cancelling...' : 'Yes, Cancel Order'}
                  </button>
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    disabled={cancelling}
                    className="flex-1 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 font-medium"
                  >
                    No, Keep Order
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
