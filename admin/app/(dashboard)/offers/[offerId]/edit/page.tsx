'use client';

/**
 * Edit Offer Page
 *
 * Page for editing existing offers
 */

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { Offer } from '@shared/types/offer';
import OfferForm from '@/components/dashboard/OfferForm';

export default function EditOfferPage() {
  const router = useRouter();
  const params = useParams();
  const offerId = params.offerId as string;

  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

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

  const handleSuccess = (updatedOfferId: string) => {
    // Redirect to offers list on success
    router.push('/offers');
  };

  const handleCancel = () => {
    // Navigate back to offers list
    router.push('/offers');
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
        <button
          onClick={() => router.push('/offers')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Back to Offers
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Edit Offer</h1>
        <p className="text-gray-600 mt-1">Update offer details and pricing</p>
      </div>

      {/* Offer Form */}
      <OfferForm offer={offer} onSuccess={handleSuccess} onCancel={handleCancel} />
    </div>
  );
}
