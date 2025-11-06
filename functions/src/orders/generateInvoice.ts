/**
 * Generate Invoice Cloud Function
 *
 * Background Firestore trigger that generates a PDF invoice when an order is confirmed.
 * Uploads the PDF to Firebase Storage and updates the order with the invoice URL.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { generateInvoicePDF, InvoiceData } from './invoiceTemplate';

/**
 * Firestore trigger: Generate invoice when order status becomes 'confirmed'
 */
export const generateInvoice = functions.firestore
  .document('orders/{orderId}')
  .onWrite(async (change, context) => {
    const orderId = context.params.orderId;

    // Only generate invoice when order is newly created or status becomes 'confirmed'
    const after = change.after.data();
    const before = change.before.data();

    if (!after) {
      // Order was deleted, no action needed
      return;
    }

    // Check if invoice generation is needed
    const shouldGenerate =
      (!before && after.status === 'pending') || // New order created
      (before && before.status !== 'confirmed' && after.status === 'confirmed'); // Status changed to confirmed

    if (!shouldGenerate) {
      return;
    }

    // Skip if invoice already exists
    if (after.invoiceUrl) {
      console.log(`Invoice already exists for order ${orderId}`);
      return;
    }

    try {
      console.log(`Generating invoice for order ${orderId}`);

      // Prepare invoice data
      const invoiceData: InvoiceData = {
        orderNumber: after.orderNumber,
        customerName: after.customerName,
        customerEmail: after.customerEmail,
        customerPhone: after.customerPhone,
        createdAt: after.createdAt,
        offers: after.offers || [],
        products: after.products || [],
        fulfillmentMethod: after.fulfillmentMethod,
        deliveryDetails: after.deliveryDetails,
        pickupDetails: after.pickupDetails,
        subtotal: after.subtotal,
        totalSavings: after.totalSavings,
        deliveryFee: after.deliveryFee,
        tax: after.tax,
        total: after.total,
      };

      // Generate PDF
      const pdfBuffer = await generateInvoicePDF(invoiceData);

      // Upload to Firebase Storage
      const bucket = admin.storage().bucket();
      const fileName = `invoices/${orderId}/${after.orderNumber}.pdf`;
      const file = bucket.file(fileName);

      await file.save(pdfBuffer, {
        metadata: {
          contentType: 'application/pdf',
          metadata: {
            orderId,
            orderNumber: after.orderNumber,
            generatedAt: new Date().toISOString(),
          },
        },
      });

      console.log(`Invoice uploaded to ${fileName}`);

      // Generate signed URL (valid for 10 years)
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 10);

      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: expiryDate,
      });

      // Update order with invoice URL
      await change.after.ref.update({
        invoiceUrl: signedUrl,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Invoice URL updated for order ${orderId}`);
    } catch (error) {
      console.error(`Error generating invoice for order ${orderId}:`, error);

      // Mark invoice generation as failed
      await change.after.ref.update({
        invoiceGenerationFailed: true,
        invoiceGenerationError: error instanceof Error ? error.message : 'Unknown error',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Re-throw error for retry logic
      throw error;
    }
  });
