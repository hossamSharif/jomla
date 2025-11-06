'use client';

/**
 * Offer Form Component
 *
 * Comprehensive form for creating and editing offers with:
 * - Product selection multi-select (T108)
 * - Individual product discount pricing (T109)
 * - Real-time discount calculation (T110)
 * - Quantity limits (T111)
 * - Status selection (T112)
 * - Image upload (T113)
 * - Validity period (T118)
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase-client';
import { getCurrentUser } from '@/lib/auth';
import { Product } from '@shared/types/product';
import { Offer, OfferProduct } from '@shared/types/offer';

// Form validation schema
const offerSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  status: z.enum(['draft', 'active', 'inactive']),
  minQuantity: z.number().min(1, 'Minimum quantity must be at least 1'),
  maxQuantity: z.number().min(1, 'Maximum quantity must be at least 1'),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
  imageFile: z.any().optional(),
});

type OfferFormData = z.infer<typeof offerSchema>;

interface OfferFormProps {
  offer?: Offer;
  onSuccess?: (offerId: string) => void;
  onCancel?: () => void;
}

interface SelectedProduct extends Product {
  discountedPrice: number;
}

export default function OfferForm({ offer, onSuccess, onCancel }: OfferFormProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<OfferFormData>({
    resolver: zodResolver(offerSchema),
    defaultValues: {
      name: offer?.name || '',
      description: offer?.description || '',
      status: offer?.status || 'draft',
      minQuantity: offer?.minQuantity || 1,
      maxQuantity: offer?.maxQuantity || 10,
      validFrom: offer?.validFrom
        ? new Date(offer.validFrom.seconds * 1000).toISOString().split('T')[0]
        : '',
      validUntil: offer?.validUntil
        ? new Date(offer.validUntil.seconds * 1000).toISOString().split('T')[0]
        : '',
    },
  });

  // Watch min/max quantity for validation
  const minQuantity = watch('minQuantity');
  const maxQuantity = watch('maxQuantity');

  // Load all active products
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const q = query(collection(db, 'products'), where('status', '==', 'active'));
        const snapshot = await getDocs(q);
        const productsData: Product[] = [];
        snapshot.forEach((doc) => {
          productsData.push({ id: doc.id, ...doc.data() } as Product);
        });
        setProducts(productsData);

        // If editing, load existing offer products
        if (offer) {
          const selected: SelectedProduct[] = offer.products.map((op) => {
            const product = productsData.find((p) => p.id === op.productId);
            return {
              ...(product || ({} as Product)),
              id: op.productId,
              name: op.productName,
              basePrice: op.basePrice,
              discountedPrice: op.discountedPrice,
            };
          });
          setSelectedProducts(selected);
        }
      } catch (error) {
        console.error('Error loading products:', error);
      } finally {
        setLoadingProducts(false);
      }
    };

    loadProducts();
  }, [offer]);

  // Calculate totals in real-time (T110)
  const totals = useMemo(() => {
    const originalTotal = selectedProducts.reduce((sum, p) => sum + p.basePrice, 0);
    const discountedTotal = selectedProducts.reduce((sum, p) => sum + p.discountedPrice, 0);
    const totalSavings = originalTotal - discountedTotal;
    const savingsPercentage = originalTotal > 0 ? (totalSavings / originalTotal) * 100 : 0;

    return {
      originalTotal,
      discountedTotal,
      totalSavings,
      savingsPercentage,
    };
  }, [selectedProducts]);

  // Add product to offer (T108)
  const handleAddProduct = (product: Product) => {
    if (selectedProducts.find((p) => p.id === product.id)) {
      return; // Already added
    }

    setSelectedProducts([
      ...selectedProducts,
      {
        ...product,
        discountedPrice: product.basePrice, // Default to base price
      },
    ]);
    setShowProductSelector(false);
  };

  // Remove product from offer
  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter((p) => p.id !== productId));
  };

  // Update product discount price (T109)
  const handleUpdateProductPrice = (productId: string, newPrice: number) => {
    setSelectedProducts(
      selectedProducts.map((p) =>
        p.id === productId ? { ...p, discountedPrice: Math.max(0, newPrice) } : p
      )
    );
  };

  // Handle image upload (T113)
  const handleImageUpload = async (file: File): Promise<string> => {
    const user = getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const timestamp = Date.now();
    const fileName = `offers/${timestamp}_${file.name}`;
    const storageRef = ref(storage, fileName);

    // Upload file
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    return downloadURL;
  };

  // Form submission
  const onSubmit = async (data: OfferFormData) => {
    if (selectedProducts.length === 0) {
      alert('Please add at least one product to the offer');
      return;
    }

    if (maxQuantity < minQuantity) {
      alert('Maximum quantity must be greater than or equal to minimum quantity');
      return;
    }

    setIsSubmitting(true);

    try {
      const user = getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      // Upload image if provided
      let imageUrl = offer?.imageUrl;
      if (data.imageFile && data.imageFile[0]) {
        imageUrl = await handleImageUpload(data.imageFile[0]);
      }

      // Build offer products array
      const offerProducts: OfferProduct[] = selectedProducts.map((p) => ({
        productId: p.id,
        productName: p.name,
        basePrice: p.basePrice,
        discountedPrice: p.discountedPrice,
        discountAmount: p.basePrice - p.discountedPrice,
        discountPercentage: ((p.basePrice - p.discountedPrice) / p.basePrice) * 100,
      }));

      // Build offer data
      const offerData: Partial<Offer> = {
        name: data.name,
        description: data.description,
        products: offerProducts,
        originalTotal: totals.originalTotal,
        discountedTotal: totals.discountedTotal,
        totalSavings: totals.totalSavings,
        savingsPercentage: totals.savingsPercentage,
        minQuantity: data.minQuantity,
        maxQuantity: data.maxQuantity,
        status: data.status,
        imageUrl,
        validFrom: data.validFrom ? Timestamp.fromDate(new Date(data.validFrom)) : undefined,
        validUntil: data.validUntil ? Timestamp.fromDate(new Date(data.validUntil)) : undefined,
        updatedAt: serverTimestamp() as Timestamp,
      };

      if (offer) {
        // Update existing offer
        await updateDoc(doc(db, 'offers', offer.id), offerData);
        onSuccess?.(offer.id);
      } else {
        // Create new offer
        const newOffer = {
          ...offerData,
          createdAt: serverTimestamp() as Timestamp,
          createdBy: user.uid,
          publishedAt:
            data.status === 'active' ? (serverTimestamp() as Timestamp) : undefined,
        };
        const docRef = await addDoc(collection(db, 'offers'), newOffer);
        onSuccess?.(docRef.id);
      }
    } catch (error) {
      console.error('Error saving offer:', error);
      alert('Failed to save offer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format price
  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  if (loadingProducts) {
    return <div className="text-center py-8">Loading products...</div>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>

        {/* Offer Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Offer Name *
          </label>
          <input
            id="name"
            type="text"
            {...register('name')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Weekend Breakfast Bundle"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description *
          </label>
          <textarea
            id="description"
            rows={3}
            {...register('description')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Describe the offer and what makes it special..."
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
          )}
        </div>

        {/* Status Selection (T112) */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            Status *
          </label>
          <select
            id="status"
            {...register('status')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <p className="mt-1 text-sm text-gray-500">
            Only active offers are visible to customers
          </p>
        </div>
      </div>

      {/* Product Selection (T108) */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Products in Offer</h2>
          <button
            type="button"
            onClick={() => setShowProductSelector(!showProductSelector)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            + Add Product
          </button>
        </div>

        {/* Product Selector Modal (T108) */}
        {showProductSelector && (
          <div className="border border-gray-300 rounded-md p-4 max-h-64 overflow-y-auto">
            <h3 className="font-medium text-gray-900 mb-2">Available Products</h3>
            <div className="space-y-2">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                >
                  <div>
                    <div className="font-medium text-sm">{product.name}</div>
                    <div className="text-xs text-gray-500">{formatPrice(product.basePrice)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddProduct(product)}
                    disabled={!!selectedProducts.find((p) => p.id === product.id)}
                    className={`px-3 py-1 text-sm rounded ${
                      selectedProducts.find((p) => p.id === product.id)
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                    }`}
                  >
                    {selectedProducts.find((p) => p.id === product.id) ? 'Added' : 'Add'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected Products with Discount Pricing (T109) */}
        {selectedProducts.length > 0 ? (
          <div className="space-y-3">
            {selectedProducts.map((product) => (
              <div key={product.id} className="border border-gray-200 rounded-md p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{product.name}</div>
                    <div className="text-sm text-gray-500">
                      Original Price: {formatPrice(product.basePrice)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveProduct(product.id)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>

                {/* Discount Price Input (T109) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discounted Price (in cents)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={product.discountedPrice}
                      onChange={(e) =>
                        handleUpdateProductPrice(product.id, parseInt(e.target.value) || 0)
                      }
                      min={0}
                      max={product.basePrice}
                      className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">
                      = {formatPrice(product.discountedPrice)}
                    </span>
                    <span className="text-sm text-green-600 ml-auto">
                      Save {formatPrice(product.basePrice - product.discountedPrice)} (
                      {(
                        ((product.basePrice - product.discountedPrice) / product.basePrice) *
                        100
                      ).toFixed(0)}
                      %)
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No products added yet. Click "Add Product" to get started.
          </div>
        )}

        {/* Real-time Totals Calculation (T110) */}
        {selectedProducts.length > 0 && (
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="bg-blue-50 rounded-md p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Original Total:</span>
                <span className="font-medium">{formatPrice(totals.originalTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Discounted Total:</span>
                <span className="font-medium text-blue-600">
                  {formatPrice(totals.discountedTotal)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-semibold border-t border-blue-200 pt-2">
                <span className="text-green-700">Total Savings:</span>
                <span className="text-green-600">
                  {formatPrice(totals.totalSavings)} ({totals.savingsPercentage.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quantity Limits (T111) */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Quantity Limits</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="minQuantity" className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Quantity *
            </label>
            <input
              id="minQuantity"
              type="number"
              {...register('minQuantity', { valueAsNumber: true })}
              min={1}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.minQuantity && (
              <p className="mt-1 text-sm text-red-600">{errors.minQuantity.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="maxQuantity" className="block text-sm font-medium text-gray-700 mb-1">
              Maximum Quantity *
            </label>
            <input
              id="maxQuantity"
              type="number"
              {...register('maxQuantity', { valueAsNumber: true })}
              min={1}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.maxQuantity && (
              <p className="mt-1 text-sm text-red-600">{errors.maxQuantity.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Validity Period (T118) */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Validity Period</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="validFrom" className="block text-sm font-medium text-gray-700 mb-1">
              Valid From (Optional)
            </label>
            <input
              id="validFrom"
              type="date"
              {...register('validFrom')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="validUntil" className="block text-sm font-medium text-gray-700 mb-1">
              Valid Until (Optional)
            </label>
            <input
              id="validUntil"
              type="date"
              {...register('validUntil')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <p className="text-sm text-gray-500">
          Leave empty for offers that don't have an expiration date
        </p>
      </div>

      {/* Image Upload (T113) */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Offer Image</h2>

        <div>
          <label htmlFor="imageFile" className="block text-sm font-medium text-gray-700 mb-1">
            Upload Image (Optional)
          </label>
          <input
            id="imageFile"
            type="file"
            accept="image/*"
            {...register('imageFile')}
            ref={fileInputRef}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-sm text-gray-500">
            Recommended size: 1200x600px. Supported formats: JPG, PNG, WebP
          </p>
        </div>

        {offer?.imageUrl && (
          <div className="mt-2">
            <p className="text-sm text-gray-600 mb-2">Current Image:</p>
            <img
              src={offer.imageUrl}
              alt={offer.name}
              className="w-full max-w-md h-48 object-cover rounded-md"
            />
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className={`flex-1 py-3 px-4 rounded-md font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
            isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isSubmitting ? 'Saving...' : offer ? 'Update Offer' : 'Create Offer'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-6 py-3 border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
