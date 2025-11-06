'use client';

/**
 * Product Creation Page (T120)
 *
 * Page for creating new products with the ProductForm component
 */

import { useRouter } from 'next/navigation';
import ProductForm from '@/components/dashboard/ProductForm';

export default function NewProductPage() {
  const router = useRouter();

  const handleSuccess = (productId: string) => {
    alert('Product created successfully!');
    router.push('/products');
  };

  const handleCancel = () => {
    if (confirm('Discard changes and go back?')) {
      router.push('/products');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Add New Product</h1>
        <p className="text-gray-600 mt-1">Create a new product for your store</p>
      </div>

      {/* Product Form */}
      <ProductForm onSuccess={handleSuccess} onCancel={handleCancel} />
    </div>
  );
}
