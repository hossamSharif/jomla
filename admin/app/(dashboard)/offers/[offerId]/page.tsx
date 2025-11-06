'use client';

/**
 * Offer Details Page
 *
 * View offer details with:
 * - Offer deletion with confirmation modal (T115)
 * - Offer activation/deactivation toggle (T116)
 * - Offer preview showing mobile app view (T117)
 */

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, deleteDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { Offer } from '@/../../shared/types/offer';

export default function OfferDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const offerId = params.offerId as string;

  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    const loadOffer = async () => {
      try {
        const offerDoc = await getDoc(doc(db, 'offers', offerId));
        if (offerDoc.exists()) {
          setOffer({ id: offerDoc.id, ...offerDoc.data() } as Offer);
        } else {
          setError('Offer not found');
        }
      } catch (err) {
        console.error('Error loading offer:', err);
        setError('Failed to load offer');
      } finally {
        setLoading(false);
      }
    };

    loadOffer();
  }, [offerId]);

  // T115: Delete offer with confirmation
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'offers', offerId));
      router.push('/offers');
    } catch (err) {
      console.error('Error deleting offer:', err);
      alert('Failed to delete offer. Please try again.');
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // T116: Toggle offer activation/deactivation
  const handleToggleStatus = async () => {
    if (!offer) return;

    const newStatus = offer.status === 'active' ? 'inactive' : 'active';
    setIsToggling(true);

    try {
      const updateData: any = {
        status: newStatus,
        updatedAt: Timestamp.now(),
      };

      // Set publishedAt when activating for the first time
      if (newStatus === 'active' && !offer.publishedAt) {
        updateData.publishedAt = Timestamp.now();
      }

      await updateDoc(doc(db, 'offers', offerId), updateData);

      // Update local state
      setOffer({
        ...offer,
        status: newStatus,
        publishedAt: updateData.publishedAt || offer.publishedAt,
      });
    } catch (err) {
      console.error('Error toggling status:', err);
      alert('Failed to update offer status. Please try again.');
    } finally {
      setIsToggling(false);
    }
  };

  // Format price
  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  // Format timestamp
  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return 'N/A';
    return timestamp.toDate().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error || 'Offer not found'}</p>
        <Link href="/offers" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          Back to Offers
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header with Actions */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{offer.name}</h1>
              <span
                className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${getStatusColor(
                  offer.status
                )}`}
              >
                {offer.status}
              </span>
            </div>
            <p className="text-gray-600">{offer.description}</p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/offers/${offerId}/edit`}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
            >
              Edit
            </Link>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* T116: Activation/Deactivation Toggle */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Offer Status</h3>
            <p className="text-sm text-gray-600 mt-1">
              {offer.status === 'active'
                ? 'This offer is currently visible to customers'
                : offer.status === 'draft'
                ? 'This offer is in draft mode'
                : 'This offer is hidden from customers'}
            </p>
          </div>
          <button
            onClick={handleToggleStatus}
            disabled={isToggling || offer.status === 'draft'}
            className={`px-4 py-2 rounded-md font-medium ${
              offer.status === 'active'
                ? 'bg-gray-600 hover:bg-gray-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            } ${isToggling || offer.status === 'draft' ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isToggling
              ? 'Updating...'
              : offer.status === 'active'
              ? 'Deactivate'
              : 'Activate'}
          </button>
        </div>
      </div>

      {/* Offer Details Grid */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Pricing Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Original Total:</span>
              <span className="font-medium line-through">{formatPrice(offer.originalTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Discounted Total:</span>
              <span className="font-medium text-blue-600">
                {formatPrice(offer.discountedTotal)}
              </span>
            </div>
            <div className="flex justify-between border-t pt-3">
              <span className="text-gray-900 font-semibold">Total Savings:</span>
              <span className="font-semibold text-green-600">
                {formatPrice(offer.totalSavings)} ({offer.savingsPercentage.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Details</h3>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-gray-600">Min Quantity:</span>
              <span className="ml-2 font-medium">{offer.minQuantity}</span>
            </div>
            <div>
              <span className="text-gray-600">Max Quantity:</span>
              <span className="ml-2 font-medium">{offer.maxQuantity}</span>
            </div>
            <div>
              <span className="text-gray-600">Valid From:</span>
              <span className="ml-2 font-medium">{formatDate(offer.validFrom)}</span>
            </div>
            <div>
              <span className="text-gray-600">Valid Until:</span>
              <span className="ml-2 font-medium">{formatDate(offer.validUntil)}</span>
            </div>
            <div>
              <span className="text-gray-600">Created:</span>
              <span className="ml-2 font-medium">{formatDate(offer.createdAt)}</span>
            </div>
            <div>
              <span className="text-gray-600">Last Updated:</span>
              <span className="ml-2 font-medium">{formatDate(offer.updatedAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Products in Offer */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Products in This Offer ({offer.products.length})
        </h3>
        <div className="space-y-3">
          {offer.products.map((product, index) => (
            <div key={index} className="border border-gray-200 rounded-md p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-gray-900">{product.productName}</div>
                  <div className="text-sm text-gray-500 mt-1">Product ID: {product.productId}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500 line-through">
                    {formatPrice(product.basePrice)}
                  </div>
                  <div className="font-medium text-blue-600">
                    {formatPrice(product.discountedPrice)}
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    Save {formatPrice(product.discountAmount)} (
                    {product.discountPercentage.toFixed(0)}%)
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* T117: Mobile App Preview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Mobile App Preview</h3>
        <p className="text-sm text-gray-600 mb-4">
          This is how the offer will appear in the mobile app
        </p>

        {/* Mobile Preview Card */}
        <div className="max-w-sm mx-auto border-2 border-gray-300 rounded-lg overflow-hidden shadow-lg">
          {/* Offer Image */}
          {offer.imageUrl && (
            <img
              src={offer.imageUrl}
              alt={offer.name}
              className="w-full h-48 object-cover"
            />
          )}

          {/* Offer Content */}
          <div className="p-4">
            <h4 className="text-lg font-bold text-gray-900 mb-1">{offer.name}</h4>
            <p className="text-sm text-gray-600 mb-3">{offer.description}</p>

            {/* Pricing Preview */}
            <div className="bg-green-50 rounded-md p-3 mb-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-green-600">
                  {formatPrice(offer.discountedTotal)}
                </span>
                <span className="text-sm text-gray-500 line-through">
                  {formatPrice(offer.originalTotal)}
                </span>
              </div>
              <div className="text-sm text-green-700 font-medium mt-1">
                Save {formatPrice(offer.totalSavings)} ({offer.savingsPercentage.toFixed(0)}%)
              </div>
            </div>

            {/* Products Preview */}
            <div className="border-t border-gray-200 pt-3">
              <div className="text-xs font-semibold text-gray-700 uppercase mb-2">
                Includes {offer.products.length} products
              </div>
              <div className="space-y-1">
                {offer.products.map((product, index) => (
                  <div key={index} className="text-xs text-gray-600">
                    • {product.productName}
                  </div>
                ))}
              </div>
            </div>

            {/* Add to Cart Button Preview */}
            <button className="w-full mt-4 py-2 bg-blue-600 text-white rounded-md font-medium text-sm">
              Add to Cart
            </button>
          </div>
        </div>
      </div>

      {/* T115: Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Offer</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{offer.name}"? This action cannot be undone and
              will remove this offer from all customer carts.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className={`flex-1 py-2 px-4 bg-red-600 text-white rounded-md font-medium ${
                  isDeleting
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-red-700'
                }`}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
