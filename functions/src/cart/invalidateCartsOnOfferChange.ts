/**
 * Invalidate Carts on Offer Change Cloud Function
 *
 * This background function triggers when an offer document is created, updated, or deleted.
 * It automatically updates all user carts that contain the affected offer to mark them as invalid.
 *
 * Trigger: Firestore onDocumentWritten for offers collection
 * Purpose: Maintain cart integrity when offers are modified or removed
 */

import { firestore } from 'firebase-functions/v2';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

interface CartOfferItem {
  offerId: string;
  offerName: string;
  quantity: number;
  discountedTotal: number;
  originalTotal: number;
  products: any[];
  version: number;
}

interface Cart {
  userId: string;
  offers: CartOfferItem[];
  products: any[];
  hasInvalidItems: boolean;
  invalidOfferIds: string[];
  updatedAt: any;
}

/**
 * Cloud Function that triggers when an offer document is written (created/updated/deleted)
 *
 * This function:
 * 1. Detects when an offer is modified, deactivated, or deleted
 * 2. Finds all carts containing the affected offer
 * 3. Marks those carts as invalid with batch updates
 * 4. Logs all invalidation events for monitoring
 */
export const invalidateCartsOnOfferChange = firestore.onDocumentWritten(
  {
    document: 'offers/{offerId}',
    maxInstances: 10,
  },
  async (event) => {
    const db = getFirestore();
    const offerId = event.params.offerId;

    // Get the before and after snapshots
    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();

    logger.info(`Offer change detected for offerId: ${offerId}`, {
      offerId,
      hasBeforeData: !!beforeData,
      hasAfterData: !!afterData,
    });

    try {
      // Determine the type of change
      let changeType: 'created' | 'updated' | 'deleted' | 'deactivated' = 'updated';
      let shouldInvalidateCarts = false;
      let offerName = 'Unknown Offer';

      if (!beforeData && afterData) {
        // Offer was created - no need to invalidate carts
        changeType = 'created';
        shouldInvalidateCarts = false;
        offerName = afterData.name || offerName;
        logger.info(`Offer created: ${offerName}`, { offerId, changeType });
      } else if (beforeData && !afterData) {
        // Offer was deleted - invalidate all carts containing this offer
        changeType = 'deleted';
        shouldInvalidateCarts = true;
        offerName = beforeData.name || offerName;
        logger.warn(`Offer deleted: ${offerName}`, { offerId, changeType });
      } else if (beforeData && afterData) {
        // Offer was updated - check if changes affect cart validity
        offerName = afterData.name || beforeData.name || offerName;

        // Check if offer was deactivated
        if (beforeData.status === 'active' && afterData.status !== 'active') {
          changeType = 'deactivated';
          shouldInvalidateCarts = true;
          logger.warn(`Offer deactivated: ${offerName}`, {
            offerId,
            changeType,
            oldStatus: beforeData.status,
            newStatus: afterData.status,
          });
        }
        // Check if pricing or products changed
        else if (
          JSON.stringify(beforeData.products) !== JSON.stringify(afterData.products) ||
          beforeData.discountedTotal !== afterData.discountedTotal ||
          beforeData.originalTotal !== afterData.originalTotal ||
          beforeData.minQuantity !== afterData.minQuantity ||
          beforeData.maxQuantity !== afterData.maxQuantity
        ) {
          changeType = 'updated';
          shouldInvalidateCarts = true;
          logger.warn(`Offer updated with significant changes: ${offerName}`, {
            offerId,
            changeType,
            productsChanged: JSON.stringify(beforeData.products) !== JSON.stringify(afterData.products),
            pricingChanged: beforeData.discountedTotal !== afterData.discountedTotal,
            quantityLimitsChanged: beforeData.minQuantity !== afterData.minQuantity ||
                                   beforeData.maxQuantity !== afterData.maxQuantity,
          });
        } else {
          // Minor update (e.g., description change) - no cart invalidation needed
          shouldInvalidateCarts = false;
          logger.info(`Offer updated with minor changes: ${offerName}`, { offerId, changeType });
        }
      }

      // If no invalidation needed, exit early
      if (!shouldInvalidateCarts) {
        logger.info(`No cart invalidation needed for offer: ${offerName}`, { offerId, changeType });
        return null;
      }

      // Since Firestore doesn't support querying nested arrays efficiently,
      // we'll need to get all carts and filter them in memory
      const allCartsSnapshot = await db.collection('carts').get();

      let affectedCartsCount = 0;
      const batch = db.batch();
      const maxBatchSize = 500; // Firestore batch limit
      let batchCount = 0;

      for (const cartDoc of allCartsSnapshot.docs) {
        const cartData = cartDoc.data() as Cart;

        // Check if this cart contains the affected offer
        const hasAffectedOffer = cartData.offers?.some(
          (offerItem: CartOfferItem) => offerItem.offerId === offerId
        );

        if (hasAffectedOffer) {
          // Add this cart's offerId to invalidOfferIds if not already present
          const currentInvalidOfferIds = cartData.invalidOfferIds || [];
          const updatedInvalidOfferIds = currentInvalidOfferIds.includes(offerId)
            ? currentInvalidOfferIds
            : [...currentInvalidOfferIds, offerId];

          // Update the cart document
          batch.update(cartDoc.ref, {
            hasInvalidItems: true,
            invalidOfferIds: updatedInvalidOfferIds,
            updatedAt: FieldValue.serverTimestamp(),
          });

          affectedCartsCount++;
          batchCount++;

          logger.info(`Marked cart as invalid`, {
            userId: cartData.userId,
            offerId,
            offerName,
            changeType,
          });

          // Commit batch if we reach the limit
          if (batchCount >= maxBatchSize) {
            await batch.commit();
            logger.info(`Committed batch of ${batchCount} cart updates`);
            batchCount = 0;
          }
        }
      }

      // Commit any remaining updates
      if (batchCount > 0) {
        await batch.commit();
        logger.info(`Committed final batch of ${batchCount} cart updates`);
      }

      // Log summary of invalidation operation
      logger.info(`Cart invalidation complete`, {
        offerId,
        offerName,
        changeType,
        totalCartsChecked: allCartsSnapshot.size,
        affectedCartsCount,
        success: true,
      });

      return {
        offerId,
        offerName,
        changeType,
        affectedCartsCount,
      };

    } catch (error) {
      // Log error with full context
      logger.error(`Failed to invalidate carts for offer: ${offerId}`, {
        offerId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Don't throw - we want to log the error but not fail the trigger
      // Cart validation will catch invalid items during checkout anyway
      return null;
    }
  }
);
