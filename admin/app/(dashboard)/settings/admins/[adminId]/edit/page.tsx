'use client';

/**
 * Edit Admin User Page
 *
 * Form for editing existing admin user accounts
 */

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';

interface AdminUser {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'super_admin' | 'admin' | 'viewer';
  permissions: {
    manageProducts: boolean;
    manageOffers: boolean;
    manageOrders: boolean;
    manageAdmins: boolean;
  };
  isActive: boolean;
  createdAt: Timestamp;
  lastLoginAt?: Timestamp;
}

interface RoleInfo {
  value: 'super_admin' | 'admin' | 'viewer';
  label: string;
  description: string;
  permissions: string[];
}

const roleOptions: RoleInfo[] = [
  {
    value: 'super_admin',
    label: 'Super Admin',
    description: 'Full system access including admin user management',
    permissions: [
      'Manage Products',
      'Manage Offers',
      'Manage Orders',
      'Manage Admin Users',
    ],
  },
  {
    value: 'admin',
    label: 'Admin',
    description: 'Can manage products, offers, and orders',
    permissions: ['Manage Products', 'Manage Offers', 'Manage Orders'],
  },
  {
    value: 'viewer',
    label: 'Viewer',
    description: 'Read-only access to dashboard data',
    permissions: ['View Products', 'View Offers', 'View Orders'],
  },
];

// Role-based permissions mapping
const rolePermissions: Record<string, {
  manageProducts: boolean;
  manageOffers: boolean;
  manageOrders: boolean;
  manageAdmins: boolean;
}> = {
  super_admin: {
    manageProducts: true,
    manageOffers: true,
    manageOrders: true,
    manageAdmins: true,
  },
  admin: {
    manageProducts: true,
    manageOffers: true,
    manageOrders: true,
    manageAdmins: false,
  },
  viewer: {
    manageProducts: false,
    manageOffers: false,
    manageOrders: false,
    manageAdmins: false,
  },
};

export default function EditAdminUserPage() {
  const router = useRouter();
  const params = useParams();
  const adminId = params.adminId as string;

  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    role: 'admin' as 'super_admin' | 'admin' | 'viewer',
    isActive: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load admin user data
  useEffect(() => {
    const loadAdminUser = async () => {
      try {
        const adminDoc = await getDoc(doc(db, 'adminUsers', adminId));

        if (!adminDoc.exists()) {
          setError('Admin user not found');
          setLoading(false);
          return;
        }

        const adminData = { uid: adminDoc.id, ...adminDoc.data() } as AdminUser;
        setAdmin(adminData);
        setFormData({
          firstName: adminData.firstName,
          lastName: adminData.lastName,
          role: adminData.role,
          isActive: adminData.isActive,
        });
        setLoading(false);
      } catch (error) {
        console.error('Error loading admin user:', error);
        setError('Failed to load admin user');
        setLoading(false);
      }
    };

    if (adminId) {
      loadAdminUser();
    }
  }, [adminId]);

  // Handle input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Clear messages when user types
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  // Validate form
  const validateForm = (): string | null => {
    if (!formData.firstName.trim()) {
      return 'First name is required';
    }

    if (!formData.lastName.trim()) {
      return 'Last name is required';
    }

    if (!formData.role) {
      return 'Role is required';
    }

    return null;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Get permissions for the selected role
      const permissions = rolePermissions[formData.role];

      // Update admin user document
      const adminRef = doc(db, 'adminUsers', adminId);
      await updateDoc(adminRef, {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        role: formData.role,
        permissions,
        isActive: formData.isActive,
        updatedAt: Timestamp.now(),
      });

      setSuccess('Admin user updated successfully');

      // Redirect to admin users list after 2 seconds
      setTimeout(() => {
        router.push('/settings/admins');
      }, 2000);
    } catch (error: any) {
      console.error('Error updating admin user:', error);
      setError(error.message || 'Failed to update admin user. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    router.push('/settings/admins');
  };

  // Format timestamp
  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return 'Never';
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
          {error || 'Admin user not found'}
        </div>
        <button
          onClick={() => router.push('/settings/admins')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Admin Users
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Edit Admin User</h1>
        <p className="text-gray-600 mt-1">Update admin user details and permissions</p>
      </div>

      {/* Admin Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-sm font-medium text-blue-900">Email Address</div>
            <div className="text-blue-700">{admin.email}</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-blue-900">User ID</div>
            <div className="text-xs text-blue-700 font-mono">{admin.uid}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-blue-200">
          <div>
            <div className="text-sm font-medium text-blue-900">Created</div>
            <div className="text-sm text-blue-700">{formatDate(admin.createdAt)}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-blue-900">Last Login</div>
            <div className="text-sm text-blue-700">{formatDate(admin.lastLoginAt)}</div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md">
              <p className="font-medium">{success}</p>
              <p className="text-sm mt-1">Redirecting to admin users list...</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {/* Personal Information */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John"
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Doe"
                />
              </div>
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Role & Permissions</h2>
            <div className="space-y-3">
              {roleOptions.map((roleOption) => (
                <label
                  key={roleOption.value}
                  className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    formData.role === roleOption.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={roleOption.value}
                    checked={formData.role === roleOption.value}
                    onChange={handleChange}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="ml-3 flex-1">
                    <div className="font-medium text-gray-900">{roleOption.label}</div>
                    <div className="text-sm text-gray-600 mt-1">{roleOption.description}</div>
                    <div className="mt-2">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                        Permissions:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {roleOption.permissions.map((permission) => (
                          <span
                            key={permission}
                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700"
                          >
                            {permission}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Account Status */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Status</h2>
            <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-gray-300">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
              />
              <div className="ml-3">
                <div className="font-medium text-gray-900">Active Account</div>
                <div className="text-sm text-gray-600 mt-1">
                  {formData.isActive
                    ? 'User can access the admin dashboard'
                    : 'User is deactivated and cannot access the admin dashboard'}
                </div>
              </div>
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
