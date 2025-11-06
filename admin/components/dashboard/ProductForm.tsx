'use client';

/**
 * Product Form Component
 *
 * Comprehensive form for creating and editing products with:
 * - Product name, description, and price inputs (T122)
 * - Category and tags inputs (T123)
 * - Image upload with compression (T124)
 * - Thumbnail generation 150x150 (T125)
 * - Quantity limits (min/max) (T126)
 * - Stock availability toggle (T127)
 * - Product preview (T132)
 */

import { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  addDoc,
  updateDoc,
  doc,
  collection,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase-client';
import { getCurrentUser } from '@/lib/auth';
import { Product } from '@shared/types/product';

// Form validation schema
const productSchema = z.object({
  name: z.string().min(3, 'Product name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  basePrice: z.number().min(1, 'Price must be at least $0.01'),
  category: z.string().min(1, 'Category is required'),
  tags: z.string(), // Comma-separated tags
  minQuantity: z.number().min(1, 'Minimum quantity must be at least 1'),
  maxQuantity: z.number().min(1, 'Maximum quantity must be at least 1'),
  inStock: z.boolean(),
  status: z.enum(['active', 'inactive']),
  imageFile: z.any().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  product?: Product;
  onSuccess?: (productId: string) => void;
  onCancel?: () => void;
}

export default function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(product?.imageUrl || null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || '',
      description: product?.description || '',
      basePrice: product?.basePrice ? product.basePrice / 100 : 0, // Convert cents to dollars for display
      category: product?.category || '',
      tags: product?.tags?.join(', ') || '',
      minQuantity: product?.minQuantity || 1,
      maxQuantity: product?.maxQuantity || 999,
      inStock: product?.inStock ?? true,
      status: product?.status || 'active',
    },
  });

  // Watch form values for preview
  const watchedValues = watch();
  const minQuantity = watch('minQuantity');
  const maxQuantity = watch('maxQuantity');

  // Handle image file selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image file size must be less than 5MB');
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Compress image using canvas (T124)
  const compressImage = (file: File, maxWidth: number, maxHeight: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions while maintaining aspect ratio
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to compress image'));
              }
            },
            'image/jpeg',
            0.85 // Quality
          );
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Generate thumbnail 150x150 (T125)
  const generateThumbnail = (file: File): Promise<Blob> => {
    return compressImage(file, 150, 150);
  };

  // Handle image upload (T124, T125)
  const handleImageUpload = async (file: File): Promise<{ imageUrl: string; thumbnailUrl: string }> => {
    const user = getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const timestamp = Date.now();
    const fileBaseName = `products/${timestamp}_${file.name.replace(/\.[^/.]+$/, '')}`;

    // Compress and upload main image (max 800x800)
    const compressedImage = await compressImage(file, 800, 800);
    const mainImageRef = ref(storage, `${fileBaseName}.jpg`);
    await uploadBytes(mainImageRef, compressedImage);
    const imageUrl = await getDownloadURL(mainImageRef);

    // Generate and upload thumbnail (150x150)
    const thumbnail = await generateThumbnail(file);
    const thumbnailRef = ref(storage, `${fileBaseName}_thumb.jpg`);
    await uploadBytes(thumbnailRef, thumbnail);
    const thumbnailUrl = await getDownloadURL(thumbnailRef);

    return { imageUrl, thumbnailUrl };
  };

  // Form submission
  const onSubmit = async (data: ProductFormData) => {
    if (maxQuantity < minQuantity) {
      alert('Maximum quantity must be greater than or equal to minimum quantity');
      return;
    }

    if (!imagePreview && !product) {
      alert('Please select a product image');
      return;
    }

    setIsSubmitting(true);

    try {
      const user = getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      // Upload image if new file provided
      let imageUrl = product?.imageUrl;
      let thumbnailUrl = product?.thumbnailUrl;

      if (data.imageFile && data.imageFile[0]) {
        setUploadProgress(10);
        const uploadResult = await handleImageUpload(data.imageFile[0]);
        imageUrl = uploadResult.imageUrl;
        thumbnailUrl = uploadResult.thumbnailUrl;
        setUploadProgress(100);
      }

      // Parse tags from comma-separated string
      const tags = data.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      // Build product data
      const productData: Partial<Product> = {
        name: data.name,
        description: data.description,
        basePrice: Math.round(data.basePrice * 100), // Convert dollars to cents
        category: data.category,
        tags,
        minQuantity: data.minQuantity,
        maxQuantity: data.maxQuantity,
        inStock: data.inStock,
        status: data.status,
        imageUrl: imageUrl!,
        thumbnailUrl,
        updatedAt: serverTimestamp() as Timestamp,
      };

      if (product) {
        // Update existing product
        await updateDoc(doc(db, 'products', product.id), productData);
        onSuccess?.(product.id);
      } else {
        // Create new product
        const newProduct = {
          ...productData,
          createdAt: serverTimestamp() as Timestamp,
          createdBy: user.uid,
        };
        const docRef = await addDoc(collection(db, 'products'), newProduct);
        onSuccess?.(docRef.id);
      }
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Failed to save product. Please try again.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  // Format price for display
  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>

        {/* Product Name (T122) */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Product Name *
          </label>
          <input
            id="name"
            type="text"
            {...register('name')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Organic Milk 1L"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
        </div>

        {/* Description (T122) */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description *
          </label>
          <textarea
            id="description"
            {...register('description')}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Fresh organic milk from local farms..."
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
          )}
        </div>

        {/* Price (T122) */}
        <div>
          <label htmlFor="basePrice" className="block text-sm font-medium text-gray-700 mb-1">
            Price (USD) *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500">$</span>
            <input
              id="basePrice"
              type="number"
              step="0.01"
              {...register('basePrice', { valueAsNumber: true })}
              className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="2.99"
            />
          </div>
          {errors.basePrice && (
            <p className="mt-1 text-sm text-red-600">{errors.basePrice.message}</p>
          )}
        </div>

        {/* Category (T123) */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Category *
          </label>
          <input
            id="category"
            type="text"
            {...register('category')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Dairy, Produce, Bakery, etc."
            list="category-suggestions"
          />
          <datalist id="category-suggestions">
            <option value="Dairy" />
            <option value="Produce" />
            <option value="Bakery" />
            <option value="Meat & Seafood" />
            <option value="Beverages" />
            <option value="Snacks" />
            <option value="Frozen Foods" />
            <option value="Pantry" />
          </datalist>
          {errors.category && (
            <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
          )}
        </div>

        {/* Tags (T123) */}
        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
            Tags (comma-separated)
          </label>
          <input
            id="tags"
            type="text"
            {...register('tags')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="organic, local, gluten-free"
          />
          <p className="mt-1 text-xs text-gray-500">
            Separate tags with commas for better searchability
          </p>
        </div>
      </div>

      {/* Image Upload (T124, T125) */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Product Image</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Image * (Max 5MB)
          </label>

          <div className="flex items-start gap-4">
            {/* Image Preview */}
            {imagePreview && (
              <div className="flex-shrink-0">
                <img
                  src={imagePreview}
                  alt="Product preview"
                  className="w-32 h-32 object-cover rounded-md border border-gray-300"
                />
              </div>
            )}

            {/* Upload Button */}
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                {...register('imageFile', {
                  onChange: handleImageSelect
                })}
                ref={(e) => {
                  register('imageFile').ref(e);
                  fileInputRef.current = e;
                }}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 font-medium"
              >
                {imagePreview ? 'Change Image' : 'Select Image'}
              </button>
              <p className="mt-2 text-xs text-gray-500">
                Image will be compressed and a 150x150 thumbnail will be generated automatically
              </p>

              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Uploading... {uploadProgress}%</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quantity Limits (T126) */}
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
              min="1"
              {...register('minQuantity', { valueAsNumber: true })}
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
              min="1"
              {...register('maxQuantity', { valueAsNumber: true })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.maxQuantity && (
              <p className="mt-1 text-sm text-red-600">{errors.maxQuantity.message}</p>
            )}
          </div>
        </div>

        {maxQuantity < minQuantity && (
          <p className="text-sm text-red-600">
            Maximum quantity must be greater than or equal to minimum quantity
          </p>
        )}
      </div>

      {/* Stock & Status (T127) */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Availability & Status</h2>

        <div className="space-y-3">
          {/* Stock Availability Toggle (T127) */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
            <div>
              <label htmlFor="inStock" className="text-sm font-medium text-gray-700">
                In Stock
              </label>
              <p className="text-xs text-gray-500">
                Product is available for purchase
              </p>
            </div>
            <Controller
              name="inStock"
              control={control}
              render={({ field }) => (
                <button
                  type="button"
                  onClick={() => field.onChange(!field.value)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    field.value ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      field.value ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              )}
            />
          </div>

          {/* Status Selection */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Product Status *
            </label>
            <select
              id="status"
              {...register('status')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">Active (Visible to customers)</option>
              <option value="inactive">Inactive (Hidden from customers)</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Inactive products won't appear in the mobile app
            </p>
          </div>
        </div>
      </div>

      {/* Product Preview (T132) */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Mobile App Preview</h2>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
        </div>

        {showPreview && (
          <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
            <div className="max-w-sm mx-auto bg-white rounded-lg shadow-md overflow-hidden">
              {/* Product Card Preview - How it appears in mobile app */}
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Product preview"
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {watchedValues.name || 'Product Name'}
                </h3>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {watchedValues.description || 'Product description...'}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <p className="text-xl font-bold text-blue-600">
                      ${watchedValues.basePrice?.toFixed(2) || '0.00'}
                    </p>
                    <p className="text-xs text-gray-500">{watchedValues.category || 'Category'}</p>
                  </div>
                  <button
                    type="button"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium"
                    disabled
                  >
                    Add to Cart
                  </button>
                </div>
                {!watchedValues.inStock && (
                  <div className="mt-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded text-center">
                    Out of Stock
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
        </button>
      </div>
    </form>
  );
}
