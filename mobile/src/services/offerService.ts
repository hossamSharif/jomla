/**
 * Offer Firestore Service
 *
 * Service for querying active offers from Firestore.
 * Provides methods for fetching offers, subscribing to real-time updates,
 * and querying offers by various criteria.
 */

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  doc,
  onSnapshot,
  Timestamp,
  QueryConstraint,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { Offer } from '../../../shared/types/offer';

const OFFERS_COLLECTION = 'offers';

/**
 * Fetch all active offers
 * Only returns offers that are active and within their validity period
 */
export async function getActiveOffers(): Promise<Offer[]> {
  try {
    const now = Timestamp.now();
    const offersRef = collection(db, OFFERS_COLLECTION);

    // Query for active offers
    const q = query(
      offersRef,
      where('status', '==', 'active'),
      orderBy('publishedAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const offers: Offer[] = [];

    querySnapshot.forEach((doc) => {
      const offerData = doc.data() as Offer;

      // Filter by validity period on client side
      // (Firestore doesn't support complex range queries with AND/OR)
      const validFrom = offerData.validFrom;
      const validUntil = offerData.validUntil;

      const isValid =
        (!validFrom || validFrom.toMillis() <= now.toMillis()) &&
        (!validUntil || validUntil.toMillis() >= now.toMillis());

      if (isValid) {
        offers.push({
          ...offerData,
          id: doc.id,
        });
      }
    });

    return offers;
  } catch (error) {
    console.error('Error fetching active offers:', error);
    throw new Error('Failed to fetch offers');
  }
}

/**
 * Fetch a single offer by ID
 */
export async function getOfferById(offerId: string): Promise<Offer | null> {
  try {
    const offerRef = doc(db, OFFERS_COLLECTION, offerId);
    const offerDoc = await getDoc(offerRef);

    if (!offerDoc.exists()) {
      return null;
    }

    return {
      ...offerDoc.data() as Offer,
      id: offerDoc.id,
    };
  } catch (error) {
    console.error('Error fetching offer by ID:', error);
    throw new Error('Failed to fetch offer');
  }
}

/**
 * Fetch offers with pagination
 * @param pageSize - Number of offers to fetch per page
 */
export async function getActiveOffersWithPagination(
  pageSize: number = 20
): Promise<Offer[]> {
  try {
    const now = Timestamp.now();
    const offersRef = collection(db, OFFERS_COLLECTION);

    const q = query(
      offersRef,
      where('status', '==', 'active'),
      orderBy('publishedAt', 'desc'),
      limit(pageSize)
    );

    const querySnapshot = await getDocs(q);
    const offers: Offer[] = [];

    querySnapshot.forEach((doc) => {
      const offerData = doc.data() as Offer;

      // Filter by validity period
      const validFrom = offerData.validFrom;
      const validUntil = offerData.validUntil;

      const isValid =
        (!validFrom || validFrom.toMillis() <= now.toMillis()) &&
        (!validUntil || validUntil.toMillis() >= now.toMillis());

      if (isValid) {
        offers.push({
          ...offerData,
          id: doc.id,
        });
      }
    });

    return offers;
  } catch (error) {
    console.error('Error fetching offers with pagination:', error);
    throw new Error('Failed to fetch offers');
  }
}

/**
 * Subscribe to real-time updates for active offers
 * @param callback - Function to call when offers change
 * @returns Unsubscribe function to stop listening
 */
export function subscribeToActiveOffers(
  callback: (offers: Offer[]) => void
): Unsubscribe {
  try {
    const now = Timestamp.now();
    const offersRef = collection(db, OFFERS_COLLECTION);

    const q = query(
      offersRef,
      where('status', '==', 'active'),
      orderBy('publishedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const offers: Offer[] = [];

        querySnapshot.forEach((doc) => {
          const offerData = doc.data() as Offer;

          // Filter by validity period
          const validFrom = offerData.validFrom;
          const validUntil = offerData.validUntil;

          const isValid =
            (!validFrom || validFrom.toMillis() <= Timestamp.now().toMillis()) &&
            (!validUntil || validUntil.toMillis() >= Timestamp.now().toMillis());

          if (isValid) {
            offers.push({
              ...offerData,
              id: doc.id,
            });
          }
        });

        callback(offers);
      },
      (error) => {
        console.error('Error in offers subscription:', error);
        callback([]);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('Error setting up offers subscription:', error);
    throw new Error('Failed to subscribe to offers');
  }
}

/**
 * Subscribe to a single offer by ID
 * @param offerId - The offer ID to subscribe to
 * @param callback - Function to call when offer changes
 * @returns Unsubscribe function
 */
export function subscribeToOffer(
  offerId: string,
  callback: (offer: Offer | null) => void
): Unsubscribe {
  try {
    const offerRef = doc(db, OFFERS_COLLECTION, offerId);

    const unsubscribe = onSnapshot(
      offerRef,
      (docSnapshot) => {
        if (!docSnapshot.exists()) {
          callback(null);
          return;
        }

        const offer: Offer = {
          ...docSnapshot.data() as Offer,
          id: docSnapshot.id,
        };

        callback(offer);
      },
      (error) => {
        console.error('Error in offer subscription:', error);
        callback(null);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('Error setting up offer subscription:', error);
    throw new Error('Failed to subscribe to offer');
  }
}

/**
 * Check if an offer is currently valid
 */
export function isOfferValid(offer: Offer): boolean {
  const now = Timestamp.now();
  const validFrom = offer.validFrom;
  const validUntil = offer.validUntil;

  return (
    offer.status === 'active' &&
    (!validFrom || validFrom.toMillis() <= now.toMillis()) &&
    (!validUntil || validUntil.toMillis() >= now.toMillis())
  );
}

/**
 * Format offer price for display
 * Converts cents to dollar amount
 */
export function formatOfferPrice(priceInCents: number): string {
  const dollars = priceInCents / 100;
  return `$${dollars.toFixed(2)}`;
}

/**
 * Calculate savings percentage for display
 */
export function calculateSavingsPercentage(
  originalTotal: number,
  discountedTotal: number
): number {
  if (originalTotal === 0) return 0;
  return Math.round(((originalTotal - discountedTotal) / originalTotal) * 100);
}
