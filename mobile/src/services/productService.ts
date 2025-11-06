/**
 * Product Firestore Service
 *
 * Service for querying products from Firestore.
 * Provides methods for fetching products, filtering by category,
 * and searching products.
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
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { Product } from '../../../shared/types/product';

const PRODUCTS_COLLECTION = 'products';

/**
 * Fetch all active products
 * Only returns products that are active and in stock
 */
export async function getActiveProducts(): Promise<Product[]> {
  try {
    const productsRef = collection(db, PRODUCTS_COLLECTION);

    const q = query(
      productsRef,
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const products: Product[] = [];

    querySnapshot.forEach((doc) => {
      products.push({
        ...doc.data() as Product,
        id: doc.id,
      });
    });

    return products;
  } catch (error) {
    console.error('Error fetching active products:', error);
    throw new Error('Failed to fetch products');
  }
}

/**
 * Fetch a single product by ID
 */
export async function getProductById(productId: string): Promise<Product | null> {
  try {
    const productRef = doc(db, PRODUCTS_COLLECTION, productId);
    const productDoc = await getDoc(productRef);

    if (!productDoc.exists()) {
      return null;
    }

    return {
      ...productDoc.data() as Product,
      id: productDoc.id,
    };
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    throw new Error('Failed to fetch product');
  }
}

/**
 * Fetch products by category
 * @param category - Category name to filter by
 */
export async function getProductsByCategory(category: string): Promise<Product[]> {
  try {
    const productsRef = collection(db, PRODUCTS_COLLECTION);

    const q = query(
      productsRef,
      where('status', '==', 'active'),
      where('category', '==', category),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const products: Product[] = [];

    querySnapshot.forEach((doc) => {
      products.push({
        ...doc.data() as Product,
        id: doc.id,
      });
    });

    return products;
  } catch (error) {
    console.error('Error fetching products by category:', error);
    throw new Error('Failed to fetch products by category');
  }
}

/**
 * Fetch products with pagination
 * @param pageSize - Number of products to fetch per page
 */
export async function getActiveProductsWithPagination(
  pageSize: number = 20
): Promise<Product[]> {
  try {
    const productsRef = collection(db, PRODUCTS_COLLECTION);

    const q = query(
      productsRef,
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );

    const querySnapshot = await getDocs(q);
    const products: Product[] = [];

    querySnapshot.forEach((doc) => {
      products.push({
        ...doc.data() as Product,
        id: doc.id,
      });
    });

    return products;
  } catch (error) {
    console.error('Error fetching products with pagination:', error);
    throw new Error('Failed to fetch products');
  }
}

/**
 * Search products by name or tags
 * Note: This is a simple client-side search. For production,
 * consider using Algolia or Elasticsearch for better search capabilities.
 * @param searchTerm - Term to search for in product names and tags
 */
export async function searchProducts(searchTerm: string): Promise<Product[]> {
  try {
    // Fetch all active products
    const products = await getActiveProducts();

    // Filter client-side by name or tags
    const lowerSearchTerm = searchTerm.toLowerCase();

    return products.filter((product) => {
      const nameMatch = product.name.toLowerCase().includes(lowerSearchTerm);
      const descriptionMatch = product.description.toLowerCase().includes(lowerSearchTerm);
      const tagsMatch = product.tags.some((tag) =>
        tag.toLowerCase().includes(lowerSearchTerm)
      );

      return nameMatch || descriptionMatch || tagsMatch;
    });
  } catch (error) {
    console.error('Error searching products:', error);
    throw new Error('Failed to search products');
  }
}

/**
 * Subscribe to real-time updates for active products
 * @param callback - Function to call when products change
 * @returns Unsubscribe function to stop listening
 */
export function subscribeToActiveProducts(
  callback: (products: Product[]) => void
): Unsubscribe {
  try {
    const productsRef = collection(db, PRODUCTS_COLLECTION);

    const q = query(
      productsRef,
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const products: Product[] = [];

        querySnapshot.forEach((doc) => {
          products.push({
            ...doc.data() as Product,
            id: doc.id,
          });
        });

        callback(products);
      },
      (error) => {
        console.error('Error in products subscription:', error);
        callback([]);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('Error setting up products subscription:', error);
    throw new Error('Failed to subscribe to products');
  }
}

/**
 * Subscribe to a single product by ID
 * @param productId - The product ID to subscribe to
 * @param callback - Function to call when product changes
 * @returns Unsubscribe function
 */
export function subscribeToProduct(
  productId: string,
  callback: (product: Product | null) => void
): Unsubscribe {
  try {
    const productRef = doc(db, PRODUCTS_COLLECTION, productId);

    const unsubscribe = onSnapshot(
      productRef,
      (docSnapshot) => {
        if (!docSnapshot.exists()) {
          callback(null);
          return;
        }

        const product: Product = {
          ...docSnapshot.data() as Product,
          id: docSnapshot.id,
        };

        callback(product);
      },
      (error) => {
        console.error('Error in product subscription:', error);
        callback(null);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('Error setting up product subscription:', error);
    throw new Error('Failed to subscribe to product');
  }
}

/**
 * Get unique categories from all products
 * Useful for category filters in UI
 */
export async function getProductCategories(): Promise<string[]> {
  try {
    const products = await getActiveProducts();
    const categories = new Set<string>();

    products.forEach((product) => {
      categories.add(product.category);
    });

    return Array.from(categories).sort();
  } catch (error) {
    console.error('Error fetching product categories:', error);
    throw new Error('Failed to fetch categories');
  }
}

/**
 * Format product price for display
 * Converts cents to dollar amount
 */
export function formatProductPrice(priceInCents: number): string {
  const dollars = priceInCents / 100;
  return `$${dollars.toFixed(2)}`;
}

/**
 * Check if product is available for purchase
 */
export function isProductAvailable(product: Product): boolean {
  return product.status === 'active' && product.inStock;
}

/**
 * Validate product quantity against constraints
 * @param quantity - Quantity to validate
 * @param product - Product with min/max constraints
 * @returns Object with validation result and message
 */
export function validateProductQuantity(
  quantity: number,
  product: Product
): { isValid: boolean; message?: string } {
  if (quantity < product.minQuantity) {
    return {
      isValid: false,
      message: `Minimum quantity is ${product.minQuantity}`,
    };
  }

  if (quantity > product.maxQuantity) {
    return {
      isValid: false,
      message: `Maximum quantity is ${product.maxQuantity}`,
    };
  }

  return { isValid: true };
}
