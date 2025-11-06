/**
 * Invoice PDF Generation Template
 *
 * Generates PDF invoices for orders using PDFKit.
 * Includes offer product breakdown, pricing details, and customer information.
 */

import * as PDFDocument from 'pdfkit';
import { Timestamp } from 'firebase-admin/firestore';

export interface InvoiceData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  createdAt: Timestamp;

  // Order Items
  offers: Array<{
    offerName: string;
    quantity: number;
    discountedTotal: number;
    originalTotal: number;
    products: Array<{
      productName: string;
      basePrice: number;
      discountedPrice: number;
    }>;
  }>;

  products: Array<{
    productName: string;
    quantity: number;
    pricePerUnit: number;
    totalPrice: number;
  }>;

  // Fulfillment
  fulfillmentMethod: 'delivery' | 'pickup';
  deliveryDetails?: {
    address: string;
    city: string;
    postalCode: string;
    notes?: string;
  };
  pickupDetails?: {
    pickupTime: Timestamp;
    pickupLocation: string;
  };

  // Totals
  subtotal: number;
  totalSavings: number;
  deliveryFee: number;
  tax: number;
  total: number;
}

/**
 * Generate invoice PDF and return as Buffer
 */
export const generateInvoicePDF = async (data: InvoiceData): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      // Collect PDF data into buffers
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Generate PDF content
      generateHeader(doc);
      generateCustomerInformation(doc, data);
      generateOrderDetails(doc, data);
      generateOfferItems(doc, data);
      generateProductItems(doc, data);
      generateTotals(doc, data);
      generateFooter(doc);

      // Finalize PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate PDF header with store branding
 */
function generateHeader(doc: PDFKit.PDFDocument) {
  doc
    .fontSize(20)
    .font('Helvetica-Bold')
    .text('Jomla Grocery Store', 50, 50)
    .fontSize(10)
    .font('Helvetica')
    .text('123 Main Street', 50, 75)
    .text('City, State 12345', 50, 90)
    .text('Phone: (555) 123-4567', 50, 105)
    .text('Email: info@jomla.com', 50, 120)
    .moveDown();
}

/**
 * Generate customer information section
 */
function generateCustomerInformation(doc: PDFKit.PDFDocument, data: InvoiceData) {
  doc
    .fontSize(16)
    .font('Helvetica-Bold')
    .text('INVOICE', 400, 50)
    .fontSize(10)
    .font('Helvetica')
    .text(`Order Number: ${data.orderNumber}`, 400, 75)
    .text(`Date: ${formatDate(data.createdAt)}`, 400, 90)
    .moveDown();

  doc
    .fontSize(12)
    .font('Helvetica-Bold')
    .text('Customer Information:', 50, 160)
    .fontSize(10)
    .font('Helvetica')
    .text(`Name: ${data.customerName}`, 50, 180)
    .text(`Email: ${data.customerEmail}`, 50, 195)
    .text(`Phone: ${data.customerPhone}`, 50, 210);

  // Add delivery/pickup details
  if (data.fulfillmentMethod === 'delivery' && data.deliveryDetails) {
    doc
      .text(`Delivery Address:`, 50, 230)
      .text(`  ${data.deliveryDetails.address}`, 50, 245)
      .text(`  ${data.deliveryDetails.city}, ${data.deliveryDetails.postalCode}`, 50, 260);
    if (data.deliveryDetails.notes) {
      doc.text(`  Notes: ${data.deliveryDetails.notes}`, 50, 275);
    }
  } else if (data.fulfillmentMethod === 'pickup' && data.pickupDetails) {
    doc
      .text(`Pickup Location: ${data.pickupDetails.pickupLocation}`, 50, 230)
      .text(`Pickup Time: ${formatDate(data.pickupDetails.pickupTime)}`, 50, 245);
  }

  doc.moveDown(2);
}

/**
 * Generate order details section header
 */
function generateOrderDetails(doc: PDFKit.PDFDocument, data: InvoiceData) {
  const currentY = doc.y;

  doc
    .fontSize(12)
    .font('Helvetica-Bold')
    .text('Order Details', 50, currentY)
    .moveDown();
}

/**
 * Generate offer items with product breakdown
 */
function generateOfferItems(doc: PDFKit.PDFDocument, data: InvoiceData) {
  if (!data.offers || data.offers.length === 0) {
    return;
  }

  const currentY = doc.y;

  doc
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('Bundled Offers:', 50, currentY)
    .moveDown(0.5);

  data.offers.forEach((offer, index) => {
    const offerY = doc.y;

    // Offer name and quantity
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(`${index + 1}. ${offer.offerName} (x${offer.quantity})`, 60, offerY);

    doc.fontSize(9).font('Helvetica');

    // Product breakdown
    offer.products.forEach((product) => {
      doc
        .text(
          `   • ${product.productName}`,
          70,
          doc.y,
          { continued: true }
        )
        .text(
          `${formatCurrency(product.discountedPrice)}`,
          480,
          doc.y,
          { align: 'right' }
        );

      if (product.discountedPrice < product.basePrice) {
        doc
          .fillColor('gray')
          .text(
            `(was ${formatCurrency(product.basePrice)})`,
            480,
            doc.y,
            { align: 'right' }
          )
          .fillColor('black');
      }
    });

    // Offer total
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(
        `Offer Total:`,
        60,
        doc.y,
        { continued: true }
      )
      .text(
        `${formatCurrency(offer.discountedTotal)}`,
        480,
        doc.y,
        { align: 'right' }
      );

    if (offer.totalSavings > 0) {
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('green')
        .text(
          `You saved: ${formatCurrency(offer.originalTotal - offer.discountedTotal)}`,
          480,
          doc.y,
          { align: 'right' }
        )
        .fillColor('black');
    }

    doc.moveDown();
  });
}

/**
 * Generate individual product items
 */
function generateProductItems(doc: PDFKit.PDFDocument, data: InvoiceData) {
  if (!data.products || data.products.length === 0) {
    return;
  }

  const currentY = doc.y;

  doc
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('Individual Products:', 50, currentY)
    .moveDown(0.5);

  data.products.forEach((product, index) => {
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(
        `${index + 1}. ${product.productName} (x${product.quantity})`,
        60,
        doc.y,
        { continued: true }
      )
      .text(
        `${formatCurrency(product.pricePerUnit)} each`,
        300,
        doc.y
      )
      .text(
        `${formatCurrency(product.totalPrice)}`,
        480,
        doc.y,
        { align: 'right' }
      );
  });

  doc.moveDown();
}

/**
 * Generate totals section
 */
function generateTotals(doc: PDFKit.PDFDocument, data: InvoiceData) {
  const currentY = doc.y + 20;

  // Draw separator line
  doc
    .strokeColor('#aaaaaa')
    .lineWidth(1)
    .moveTo(350, currentY)
    .lineTo(550, currentY)
    .stroke();

  let yPosition = currentY + 10;

  // Subtotal
  doc
    .fontSize(10)
    .font('Helvetica')
    .text('Subtotal:', 350, yPosition)
    .text(formatCurrency(data.subtotal), 480, yPosition, { align: 'right' });
  yPosition += 20;

  // Savings
  if (data.totalSavings > 0) {
    doc
      .fillColor('green')
      .text('Total Savings:', 350, yPosition)
      .text(`-${formatCurrency(data.totalSavings)}`, 480, yPosition, { align: 'right' })
      .fillColor('black');
    yPosition += 20;
  }

  // Delivery fee
  if (data.deliveryFee > 0) {
    doc
      .text('Delivery Fee:', 350, yPosition)
      .text(formatCurrency(data.deliveryFee), 480, yPosition, { align: 'right' });
    yPosition += 20;
  }

  // Tax
  doc
    .text('Tax (10%):', 350, yPosition)
    .text(formatCurrency(data.tax), 480, yPosition, { align: 'right' });
  yPosition += 20;

  // Draw separator line
  doc
    .strokeColor('#aaaaaa')
    .lineWidth(2)
    .moveTo(350, yPosition)
    .lineTo(550, yPosition)
    .stroke();

  yPosition += 10;

  // Total
  doc
    .fontSize(12)
    .font('Helvetica-Bold')
    .text('TOTAL:', 350, yPosition)
    .text(formatCurrency(data.total), 480, yPosition, { align: 'right' });
}

/**
 * Generate footer
 */
function generateFooter(doc: PDFKit.PDFDocument) {
  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor('gray')
    .text(
      'Thank you for shopping with Jomla Grocery Store!',
      50,
      750,
      { align: 'center' }
    )
    .text(
      'For any questions, please contact us at support@jomla.com or (555) 123-4567',
      50,
      765,
      { align: 'center' }
    )
    .fillColor('black');
}

/**
 * Format currency (cents to dollars)
 */
function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars.toFixed(2)}`;
}

/**
 * Format Firestore Timestamp to readable date
 */
function formatDate(timestamp: Timestamp): string {
  const date = timestamp.toDate();
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
