'use client';

/**
 * Products List Page
 *
 * Display all products with filtering, search, and management actions
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, query, orderBy, onSnapshot, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { Product } from '@shared/types/product';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in-stock' | 'out-of-stock'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to products collection
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const productsData: Product[] = [];
        snapshot.forEach((doc) => {
          productsData.push({ id: doc.id, ...doc.data() } as Product);
        });
        setProducts(productsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching products:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Get unique categories from products
  const categories = Array.from(new Set(products.map((p) => p.category))).filter(Boolean);

  // Filter products based on status, stock, category, and search term
  const filteredProducts = products.filter((product) => {
    const matchesStatusFilter = filter === 'all' || product.status === filter;
    const matchesStockFilter =
      stockFilter === 'all' ||
      (stockFilter === 'in-stock' && product.inStock) ||
      (stockFilter === 'out-of-stock' && !product.inStock);
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSearch =
      searchTerm === '' ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatusFilter && matchesStockFilter && matchesCategory && matchesSearch;
  });

  // Toggle product status
  const toggleProductStatus = async (productId: string, currentStatus: 'active' | 'inactive') => {
    setUpdatingStatus(productId);
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, {
        status: newStatus,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating product status:', error);
      alert('Failed to update product status. Please try again.');
    } finally {
      setUpdatingStatus(null);
    }
  };

  // Format price in cents to dollars
  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  // Format timestamp
  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return 'N/A';
    return timestamp.toDate().toLocaleDateString();
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Products</h1>
            <p className="text-gray-600 mt-1">Manage individual products</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/products/import"
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 font-medium"
            >
              Import CSV
            </Link>
            <Link
              href="/products/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
            >
              + Add Product
            </Link>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="space-y-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search products by name, description, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filters Row */}
          <div className="flex gap-4 flex-wrap items-center">
            {/* Status Filter */}
            <div className="flex gap-2">
              <span className="text-sm font-medium text-gray-700 self-center mr-2">Status:</span>
              {(['all', 'active', 'inactive'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-3 py-1 rounded-md text-sm font-medium capitalize ${
                    filter === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Stock Filter */}
            <div className="flex gap-2">
              <span className="text-sm font-medium text-gray-700 self-center mr-2">Stock:</span>
              {(['all', 'in-stock', 'out-of-stock'] as const).map((stock) => (
                <button
                  key={stock}
                  onClick={() => setStockFilter(stock)}
                  className={`px-3 py-1 rounded-md text-sm font-medium capitalize ${
                    stockFilter === stock
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {stock}
                </button>
              ))}
            </div>

            {/* Category Filter */}
            {categories.length > 0 && (
              <div className="flex gap-2">
                <span className="text-sm font-medium text-gray-700 self-center mr-2">Category:</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Results Count */}
        <div className="mt-3 text-sm text-gray-600">
          Showing {filteredProducts.length} of {products.length} products
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity Limits
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm || filter !== 'all' || stockFilter !== 'all' || selectedCategory !== 'all'
                      ? 'No products match your filters'
                      : 'No products yet. Add your first product to get started.'}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {product.thumbnailUrl && (
                          <img
                            src={product.thumbnailUrl}
                            alt={product.name}
                            className="w-12 h-12 rounded-md object-cover"
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {product.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{product.category}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {formatPrice(product.basePrice)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      Min: {product.minQuantity} / Max: {product.maxQuantity}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          product.inStock
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {product.inStock ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleProductStatus(product.id, product.status)}
                        disabled={updatingStatus === product.id}
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                          product.status
                        )} ${
                          updatingStatus === product.id
                            ? 'opacity-50 cursor-not-allowed'
                            : 'cursor-pointer hover:opacity-80'
                        }`}
                      >
                        {updatingStatus === product.id ? 'Updating...' : product.status}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(product.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <div className="flex gap-2">
                        <Link
                          href={`/products/${product.id}/edit`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
