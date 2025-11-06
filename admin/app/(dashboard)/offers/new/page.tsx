'use client';

/**
 * Create New Offer Page
 *
 * Page for creating new bundled product offers
 */

import { useRouter } from 'next/navigation';
import OfferForm from '@/components/dashboard/OfferForm';

export default function NewOfferPage() {
  const router = useRouter();

  const handleSuccess = (offerId: string) => {
    // Redirect to offers list on success
    router.push('/offers');
  };

  const handleCancel = () => {
    // Navigate back to offers list
    router.push('/offers');
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create New Offer</h1>
        <p className="text-gray-600 mt-1">
          Create a bundled product offer with discounted pricing
        </p>
      </div>

      {/* Offer Form */}
      <OfferForm onSuccess={handleSuccess} onCancel={handleCancel} />
    </div>
  );
}
