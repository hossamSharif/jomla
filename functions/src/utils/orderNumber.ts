/**
 * Order Number Generation Utility
 *
 * Generates unique, human-readable order numbers in the format: ORD-YYYYMMDD-####
 * Example: ORD-20251106-0001
 *
 * The counter resets daily and is stored in Firestore for atomic increments.
 */

import * as admin from 'firebase-admin';

/**
 * Generate a unique order number for today
 * Format: ORD-YYYYMMDD-####
 *
 * Uses Firestore transaction to ensure atomicity and uniqueness
 */
export const generateOrderNumber = async (): Promise<string> => {
  const db = admin.firestore();
  const today = new Date();
  const dateStr = formatDate(today);

  // Counter document path: counters/orders-YYYYMMDD
  const counterDocPath = `counters/orders-${dateStr}`;
  const counterRef = db.doc(counterDocPath);

  // Use transaction to atomically increment counter
  const orderNumber = await db.runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef);

    let nextNumber = 1;

    if (counterDoc.exists) {
      const data = counterDoc.data();
      nextNumber = (data?.count || 0) + 1;
    }

    // Update counter
    transaction.set(
      counterRef,
      {
        count: nextNumber,
        date: dateStr,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Format order number: ORD-YYYYMMDD-####
    const paddedNumber = String(nextNumber).padStart(4, '0');
    return `ORD-${dateStr}-${paddedNumber}`;
  });

  return orderNumber;
};

/**
 * Format date as YYYYMMDD
 */
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

/**
 * Parse order number to extract date and sequence
 * Example: ORD-20251106-0001 => { date: '20251106', sequence: 1 }
 */
export const parseOrderNumber = (
  orderNumber: string
): { date: string; sequence: number } | null => {
  const match = orderNumber.match(/^ORD-(\d{8})-(\d{4})$/);

  if (!match) {
    return null;
  }

  return {
    date: match[1],
    sequence: parseInt(match[2], 10),
  };
};

/**
 * Validate order number format
 */
export const isValidOrderNumber = (orderNumber: string): boolean => {
  return /^ORD-\d{8}-\d{4}$/.test(orderNumber);
};
