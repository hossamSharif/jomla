/**
 * Seed Data Script for Development and Testing
 *
 * This script populates the Firebase database with sample data for:
 * - Products
 * - Offers (bundled products with discounts)
 * - Admin users
 *
 * Usage:
 * 1. With Firebase Emulators: Run this script against local emulators
 * 2. With Production/Staging: Use with caution - only for initial setup
 *
 * Run command:
 * firebase functions:shell
 * > seedDatabase()
 */

import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();

/**
 * Sample product data
 */
const sampleProducts = [
  {
    name: 'Organic Whole Milk 1L',
    description: 'Fresh organic whole milk from local farms',
    basePrice: 299, // $2.99
    category: 'Dairy',
    tags: ['organic', 'dairy', 'milk'],
    inStock: true,
    status: 'active' as const,
    minQuantity: 1,
    maxQuantity: 10,
  },
  {
    name: 'Free Range Eggs (12 pack)',
    description: 'Farm fresh free range eggs',
    basePrice: 449, // $4.49
    category: 'Dairy',
    tags: ['eggs', 'free-range', 'protein'],
    inStock: true,
    status: 'active' as const,
    minQuantity: 1,
    maxQuantity: 5,
  },
  {
    name: 'Whole Wheat Bread',
    description: 'Freshly baked whole wheat bread',
    basePrice: 349, // $3.49
    category: 'Bakery',
    tags: ['bread', 'wheat', 'bakery'],
    inStock: true,
    status: 'active' as const,
    minQuantity: 1,
    maxQuantity: 5,
  },
  {
    name: 'Organic Bananas (1 kg)',
    description: 'Fresh organic bananas',
    basePrice: 199, // $1.99
    category: 'Produce',
    tags: ['fruit', 'organic', 'bananas'],
    inStock: true,
    status: 'active' as const,
    minQuantity: 1,
    maxQuantity: 10,
  },
  {
    name: 'Fresh Strawberries (500g)',
    description: 'Sweet and juicy strawberries',
    basePrice: 599, // $5.99
    category: 'Produce',
    tags: ['fruit', 'berries', 'strawberries'],
    inStock: true,
    status: 'active' as const,
    minQuantity: 1,
    maxQuantity: 5,
  },
  {
    name: 'Greek Yogurt (500g)',
    description: 'Creamy Greek yogurt',
    basePrice: 449, // $4.49
    category: 'Dairy',
    tags: ['yogurt', 'dairy', 'protein'],
    inStock: true,
    status: 'active' as const,
    minQuantity: 1,
    maxQuantity: 10,
  },
  {
    name: 'Orange Juice (1L)',
    description: '100% pure orange juice',
    basePrice: 399, // $3.99
    category: 'Beverages',
    tags: ['juice', 'orange', 'beverage'],
    inStock: true,
    status: 'active' as const,
    minQuantity: 1,
    maxQuantity: 5,
  },
  {
    name: 'Pasta (500g)',
    description: 'Italian durum wheat pasta',
    basePrice: 249, // $2.49
    category: 'Pantry',
    tags: ['pasta', 'pantry', 'italian'],
    inStock: true,
    status: 'active' as const,
    minQuantity: 1,
    maxQuantity: 10,
  },
  {
    name: 'Olive Oil (500ml)',
    description: 'Extra virgin olive oil',
    basePrice: 899, // $8.99
    category: 'Pantry',
    tags: ['oil', 'olive', 'cooking'],
    inStock: true,
    status: 'active' as const,
    minQuantity: 1,
    maxQuantity: 3,
  },
  {
    name: 'Tomato Sauce (400g)',
    description: 'Italian style tomato sauce',
    basePrice: 299, // $2.99
    category: 'Pantry',
    tags: ['sauce', 'tomato', 'italian'],
    inStock: true,
    status: 'active' as const,
    minQuantity: 1,
    maxQuantity: 10,
  },
];

/**
 * Create sample admin user
 */
async function createSampleAdmin(): Promise<string> {
  try {
    const adminEmail = 'admin@jomla.com';
    const adminPassword = 'Admin123!';

    // Check if admin already exists
    try {
      const existingUser = await auth.getUserByEmail(adminEmail);
      console.log(`Admin user already exists: ${existingUser.uid}`);
      return existingUser.uid;
    } catch (error: any) {
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    }

    // Create admin user
    const adminUser = await auth.createUser({
      email: adminEmail,
      password: adminPassword,
      emailVerified: true,
    });

    // Set admin custom claims
    await auth.setCustomUserClaims(adminUser.uid, { admin: true });

    // Create admin user document
    await db.collection('adminUsers').doc(adminUser.uid).set({
      uid: adminUser.uid,
      email: adminEmail,
      firstName: 'Admin',
      lastName: 'User',
      role: 'super_admin',
      permissions: {
        manageProducts: true,
        manageOffers: true,
        manageOrders: true,
        manageAdmins: true,
      },
      isActive: true,
      createdAt: Timestamp.now(),
      lastLoginAt: Timestamp.now(),
    });

    console.log(`Admin user created: ${adminUser.uid} (${adminEmail})`);
    console.log(`Admin password: ${adminPassword}`);
    return adminUser.uid;
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  }
}

/**
 * Create sample products
 */
async function createSampleProducts(adminUid: string): Promise<string[]> {
  const productIds: string[] = [];

  try {
    for (const productData of sampleProducts) {
      const docRef = await db.collection('products').add({
        ...productData,
        imageUrl: 'https://via.placeholder.com/400x400?text=' + encodeURIComponent(productData.name),
        thumbnailUrl: 'https://via.placeholder.com/150x150?text=' + encodeURIComponent(productData.name),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: adminUid,
      });

      productIds.push(docRef.id);
      console.log(`Created product: ${productData.name} (${docRef.id})`);
    }

    return productIds;
  } catch (error) {
    console.error('Error creating products:', error);
    throw error;
  }
}

/**
 * Create sample offers
 */
async function createSampleOffers(productIds: string[], adminUid: string): Promise<void> {
  try {
    // Get product documents for denormalization
    const productDocs = await Promise.all(
      productIds.map(id => db.collection('products').doc(id).get())
    );

    const products = productDocs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Offer 1: Breakfast Bundle
    const breakfastProducts = [
      { index: 0, discount: 0.10 }, // Milk - 10% off
      { index: 1, discount: 0.15 }, // Eggs - 15% off
      { index: 2, discount: 0.10 }, // Bread - 10% off
      { index: 6, discount: 0.10 }, // Orange Juice - 10% off
    ];

    const breakfastOfferProducts = breakfastProducts.map(({ index, discount }) => {
      const product = products[index];
      const basePrice = product.basePrice;
      const discountedPrice = Math.round(basePrice * (1 - discount));
      return {
        productId: product.id,
        productName: product.name,
        basePrice,
        discountedPrice,
        discountAmount: basePrice - discountedPrice,
        discountPercentage: discount * 100,
      };
    });

    const breakfastOriginalTotal = breakfastOfferProducts.reduce((sum, p) => sum + p.basePrice, 0);
    const breakfastDiscountedTotal = breakfastOfferProducts.reduce((sum, p) => sum + p.discountedPrice, 0);

    await db.collection('offers').add({
      name: 'Weekend Breakfast Bundle',
      description: 'Start your weekend right with our complete breakfast bundle',
      products: breakfastOfferProducts,
      originalTotal: breakfastOriginalTotal,
      discountedTotal: breakfastDiscountedTotal,
      totalSavings: breakfastOriginalTotal - breakfastDiscountedTotal,
      savingsPercentage: ((breakfastOriginalTotal - breakfastDiscountedTotal) / breakfastOriginalTotal) * 100,
      minQuantity: 1,
      maxQuantity: 5,
      status: 'active',
      imageUrl: 'https://via.placeholder.com/800x400?text=Breakfast+Bundle',
      thumbnailUrl: 'https://via.placeholder.com/150x150?text=Breakfast',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      publishedAt: Timestamp.now(),
      createdBy: adminUid,
    });

    console.log('Created offer: Weekend Breakfast Bundle');

    // Offer 2: Healthy Snack Bundle
    const snackProducts = [
      { index: 3, discount: 0.20 }, // Bananas - 20% off
      { index: 4, discount: 0.15 }, // Strawberries - 15% off
      { index: 5, discount: 0.10 }, // Greek Yogurt - 10% off
    ];

    const snackOfferProducts = snackProducts.map(({ index, discount }) => {
      const product = products[index];
      const basePrice = product.basePrice;
      const discountedPrice = Math.round(basePrice * (1 - discount));
      return {
        productId: product.id,
        productName: product.name,
        basePrice,
        discountedPrice,
        discountAmount: basePrice - discountedPrice,
        discountPercentage: discount * 100,
      };
    });

    const snackOriginalTotal = snackOfferProducts.reduce((sum, p) => sum + p.basePrice, 0);
    const snackDiscountedTotal = snackOfferProducts.reduce((sum, p) => sum + p.discountedPrice, 0);

    await db.collection('offers').add({
      name: 'Healthy Snack Bundle',
      description: 'Perfect combination of fruits and yogurt for healthy snacking',
      products: snackOfferProducts,
      originalTotal: snackOriginalTotal,
      discountedTotal: snackDiscountedTotal,
      totalSavings: snackOriginalTotal - snackDiscountedTotal,
      savingsPercentage: ((snackOriginalTotal - snackDiscountedTotal) / snackOriginalTotal) * 100,
      minQuantity: 1,
      maxQuantity: 5,
      status: 'active',
      imageUrl: 'https://via.placeholder.com/800x400?text=Healthy+Snack+Bundle',
      thumbnailUrl: 'https://via.placeholder.com/150x150?text=Snacks',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      publishedAt: Timestamp.now(),
      createdBy: adminUid,
    });

    console.log('Created offer: Healthy Snack Bundle');

    // Offer 3: Italian Pasta Night
    const pastaProducts = [
      { index: 7, discount: 0.10 }, // Pasta - 10% off
      { index: 8, discount: 0.15 }, // Olive Oil - 15% off
      { index: 9, discount: 0.10 }, // Tomato Sauce - 10% off
    ];

    const pastaOfferProducts = pastaProducts.map(({ index, discount }) => {
      const product = products[index];
      const basePrice = product.basePrice;
      const discountedPrice = Math.round(basePrice * (1 - discount));
      return {
        productId: product.id,
        productName: product.name,
        basePrice,
        discountedPrice,
        discountAmount: basePrice - discountedPrice,
        discountPercentage: discount * 100,
      };
    });

    const pastaOriginalTotal = pastaOfferProducts.reduce((sum, p) => sum + p.basePrice, 0);
    const pastaDiscountedTotal = pastaOfferProducts.reduce((sum, p) => sum + p.discountedPrice, 0);

    await db.collection('offers').add({
      name: 'Italian Pasta Night',
      description: 'Everything you need for an authentic Italian pasta dinner',
      products: pastaOfferProducts,
      originalTotal: pastaOriginalTotal,
      discountedTotal: pastaDiscountedTotal,
      totalSavings: pastaOriginalTotal - pastaDiscountedTotal,
      savingsPercentage: ((pastaOriginalTotal - pastaDiscountedTotal) / pastaOriginalTotal) * 100,
      minQuantity: 1,
      maxQuantity: 10,
      status: 'active',
      imageUrl: 'https://via.placeholder.com/800x400?text=Italian+Pasta+Night',
      thumbnailUrl: 'https://via.placeholder.com/150x150?text=Pasta',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      publishedAt: Timestamp.now(),
      createdBy: adminUid,
    });

    console.log('Created offer: Italian Pasta Night');
  } catch (error) {
    console.error('Error creating offers:', error);
    throw error;
  }
}

/**
 * Main seed function
 */
export async function seedDatabase(): Promise<void> {
  console.log('Starting database seeding...');

  try {
    // Step 1: Create admin user
    console.log('\n1. Creating admin user...');
    const adminUid = await createSampleAdmin();

    // Step 2: Create sample products
    console.log('\n2. Creating sample products...');
    const productIds = await createSampleProducts(adminUid);

    // Step 3: Create sample offers
    console.log('\n3. Creating sample offers...');
    await createSampleOffers(productIds, adminUid);

    console.log('\n✓ Database seeding completed successfully!');
    console.log('\nSample Admin Credentials:');
    console.log('Email: admin@jomla.com');
    console.log('Password: Admin123!');
  } catch (error) {
    console.error('\n✗ Database seeding failed:', error);
    throw error;
  }
}

/**
 * Clear all data (use with caution!)
 */
export async function clearDatabase(): Promise<void> {
  console.log('WARNING: Clearing all data from database...');

  try {
    // Delete all products
    const products = await db.collection('products').get();
    const productDeletes = products.docs.map(doc => doc.ref.delete());
    await Promise.all(productDeletes);
    console.log(`Deleted ${products.size} products`);

    // Delete all offers
    const offers = await db.collection('offers').get();
    const offerDeletes = offers.docs.map(doc => doc.ref.delete());
    await Promise.all(offerDeletes);
    console.log(`Deleted ${offers.size} offers`);

    // Delete all carts
    const carts = await db.collection('carts').get();
    const cartDeletes = carts.docs.map(doc => doc.ref.delete());
    await Promise.all(cartDeletes);
    console.log(`Deleted ${carts.size} carts`);

    // Delete all orders
    const orders = await db.collection('orders').get();
    const orderDeletes = orders.docs.map(doc => doc.ref.delete());
    await Promise.all(orderDeletes);
    console.log(`Deleted ${orders.size} orders`);

    // Delete all notifications
    const notifications = await db.collection('notifications').get();
    const notificationDeletes = notifications.docs.map(doc => doc.ref.delete());
    await Promise.all(notificationDeletes);
    console.log(`Deleted ${notifications.size} notifications`);

    console.log('\n✓ Database cleared successfully!');
  } catch (error) {
    console.error('\n✗ Database clearing failed:', error);
    throw error;
  }
}
