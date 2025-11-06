'use client';

/**
 * Bulk Product Import Page (T131)
 *
 * Upload CSV file to import multiple products at once
 */

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { getCurrentUser } from '@/lib/auth';
import { Product } from '@shared/types/product';

interface ParsedProduct {
  name: string;
  description: string;
  basePrice: number;
  category: string;
  tags: string[];
  minQuantity: number;
  maxQuantity: number;
  inStock: boolean;
  status: 'active' | 'inactive';
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export default function ImportProductsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<ParsedProduct[]>([]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        alert('Please select a CSV file');
        return;
      }
      setFile(selectedFile);
      setImportResult(null);
      parseCSVPreview(selectedFile);
    }
  };

  // Parse CSV file for preview
  const parseCSVPreview = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.split('\n').filter((line) => line.trim());

      if (lines.length < 2) {
        alert('CSV file is empty or invalid');
        return;
      }

      // Parse first 5 rows for preview
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const preview: ParsedProduct[] = [];

      for (let i = 1; i < Math.min(6, lines.length); i++) {
        const values = parseCSVLine(lines[i]);
        const product = parseProductFromRow(headers, values);
        if (product) {
          preview.push(product);
        }
      }

      setPreviewData(preview);
    } catch (error) {
      console.error('Error parsing CSV:', error);
      alert('Failed to parse CSV file');
    }
  };

  // Parse CSV line handling quoted values
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  };

  // Parse product data from CSV row
  const parseProductFromRow = (headers: string[], values: string[]): ParsedProduct | null => {
    try {
      const getColumnValue = (columnNames: string[]): string => {
        for (const name of columnNames) {
          const index = headers.indexOf(name);
          if (index !== -1 && values[index]) {
            return values[index];
          }
        }
        return '';
      };

      const name = getColumnValue(['name', 'product name', 'product_name']);
      const description = getColumnValue(['description', 'desc']);
      const priceStr = getColumnValue(['price', 'baseprice', 'base_price']);
      const category = getColumnValue(['category', 'cat']);
      const tagsStr = getColumnValue(['tags']);
      const minQtyStr = getColumnValue(['minquantity', 'min_quantity', 'min']);
      const maxQtyStr = getColumnValue(['maxquantity', 'max_quantity', 'max']);
      const inStockStr = getColumnValue(['instock', 'in_stock', 'stock']);
      const statusStr = getColumnValue(['status']);

      if (!name || !description || !priceStr || !category) {
        return null;
      }

      const basePrice = Math.round(parseFloat(priceStr) * 100); // Convert dollars to cents
      const tags = tagsStr
        .split(';')
        .map((t) => t.trim())
        .filter((t) => t);
      const minQuantity = parseInt(minQtyStr) || 1;
      const maxQuantity = parseInt(maxQtyStr) || 999;
      const inStock = inStockStr.toLowerCase() !== 'false' && inStockStr !== '0';
      const status = statusStr.toLowerCase() === 'active' ? 'active' : 'inactive';

      return {
        name,
        description,
        basePrice,
        category,
        tags,
        minQuantity,
        maxQuantity,
        inStock,
        status,
      };
    } catch (error) {
      return null;
    }
  };

  // Process CSV import
  const handleImport = async () => {
    if (!file) {
      alert('Please select a CSV file first');
      return;
    }

    const user = getCurrentUser();
    if (!user) {
      alert('Not authenticated');
      return;
    }

    setIsProcessing(true);
    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    try {
      const text = await file.text();
      const lines = text.split('\n').filter((line) => line.trim());

      if (lines.length < 2) {
        alert('CSV file is empty or invalid');
        setIsProcessing(false);
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

      // Process each row
      for (let i = 1; i < lines.length; i++) {
        try {
          const values = parseCSVLine(lines[i]);
          const productData = parseProductFromRow(headers, values);

          if (!productData) {
            result.failed++;
            result.errors.push(`Row ${i + 1}: Missing required fields or invalid data`);
            continue;
          }

          // Create product in Firestore
          const newProduct: Omit<Product, 'id'> = {
            ...productData,
            imageUrl: '', // Default empty - admin must upload images later
            createdAt: serverTimestamp() as Timestamp,
            updatedAt: serverTimestamp() as Timestamp,
            createdBy: user.uid,
          };

          await addDoc(collection(db, 'products'), newProduct);
          result.success++;
        } catch (error) {
          result.failed++;
          result.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      setImportResult(result);
    } catch (error) {
      console.error('Error importing products:', error);
      alert('Failed to import products. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Format price
  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Import Products</h1>
            <p className="text-gray-600 mt-1">Upload a CSV file to import multiple products</p>
          </div>
          <button
            onClick={() => router.push('/products')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
          >
            Back to Products
          </button>
        </div>
      </div>

      {/* CSV Format Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-3">CSV Format Requirements</h2>
        <div className="text-sm text-blue-800 space-y-2">
          <p>
            <strong>Required columns:</strong> name, description, price (in dollars), category
          </p>
          <p>
            <strong>Optional columns:</strong> tags (semicolon-separated), minQuantity, maxQuantity,
            inStock (true/false), status (active/inactive)
          </p>
          <p>
            <strong>Note:</strong> Images are not imported via CSV. You'll need to add images
            individually after import.
          </p>
        </div>

        {/* Sample CSV */}
        <div className="mt-4">
          <p className="text-sm font-medium text-blue-900 mb-2">Example CSV format:</p>
          <pre className="bg-white p-3 rounded text-xs overflow-x-auto text-gray-800 border border-blue-300">
            {`name,description,price,category,tags,minQuantity,maxQuantity,inStock,status
Organic Milk 1L,Fresh organic milk from local farms,2.99,Dairy,organic;local,1,20,true,active
Whole Wheat Bread,Freshly baked whole wheat bread,3.49,Bakery,fresh;wheat,1,10,true,active
Bananas,Fresh yellow bananas,1.29,Produce,fruit;fresh,1,50,true,active`}
          </pre>
        </div>

        {/* Download Template */}
        <div className="mt-4">
          <button
            onClick={() => {
              const csvContent =
                'name,description,price,category,tags,minQuantity,maxQuantity,inStock,status\n';
              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'products_template.csv';
              a.click();
            }}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium underline"
          >
            Download CSV Template
          </button>
        </div>
      </div>

      {/* File Upload Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload CSV File</h2>

        <div className="space-y-4">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {file ? 'Change File' : 'Select CSV File'}
            </button>

            {file && (
              <div className="mt-3 text-sm text-gray-600">
                Selected file: <span className="font-medium">{file.name}</span>
              </div>
            )}
          </div>

          {file && !isProcessing && !importResult && (
            <div className="flex gap-3">
              <button
                onClick={handleImport}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
              >
                Import Products
              </button>
              <button
                onClick={() => {
                  setFile(null);
                  setPreviewData([]);
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
            </div>
          )}

          {isProcessing && (
            <div className="flex items-center gap-3 text-blue-600">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span>Processing CSV file...</span>
            </div>
          )}
        </div>
      </div>

      {/* Preview Data */}
      {previewData.length > 0 && !importResult && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Preview (First 5 Products)
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Price
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Quantity Limits
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {previewData.map((product, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 text-sm text-gray-900">{product.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{product.category}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {formatPrice(product.basePrice)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {product.minQuantity} - {product.maxQuantity}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          product.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {product.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import Results */}
      {importResult && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Import Results</h2>

          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-600 font-medium">Successful Imports</p>
                <p className="text-3xl font-bold text-green-700 mt-1">{importResult.success}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-600 font-medium">Failed Imports</p>
                <p className="text-3xl font-bold text-red-700 mt-1">{importResult.failed}</p>
              </div>
            </div>

            {/* Errors */}
            {importResult.errors.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Errors:</h3>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <ul className="text-sm text-red-800 space-y-1">
                    {importResult.errors.map((error, idx) => (
                      <li key={idx}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => router.push('/products')}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
              >
                View Products
              </button>
              <button
                onClick={() => {
                  setFile(null);
                  setPreviewData([]);
                  setImportResult(null);
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
              >
                Import Another File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
