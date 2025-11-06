'use client';

/**
 * Admin Users List Page
 *
 * Display all admin users with role information and management actions
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, query, orderBy, onSnapshot, Timestamp, doc, updateDoc } from 'firebase/firestore';
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

export default function AdminUsersPage() {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | AdminUser['role']>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to adminUsers collection
    const q = query(collection(db, 'adminUsers'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const adminUsersData: AdminUser[] = [];
        snapshot.forEach((doc) => {
          adminUsersData.push({ uid: doc.id, ...doc.data() } as AdminUser);
        });
        setAdminUsers(adminUsersData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching admin users:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filter admin users based on criteria
  const filteredAdminUsers = adminUsers.filter((admin) => {
    // Role filter
    const matchesRole = roleFilter === 'all' || admin.role === roleFilter;

    // Status filter
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && admin.isActive) ||
      (statusFilter === 'inactive' && !admin.isActive);

    // Search filter
    const matchesSearch =
      searchTerm === '' ||
      admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.lastName.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesRole && matchesStatus && matchesSearch;
  });

  // Toggle admin user active status
  const toggleAdminStatus = async (adminId: string, currentStatus: boolean) => {
    try {
      setUpdatingUserId(adminId);
      const adminRef = doc(db, 'adminUsers', adminId);
      await updateDoc(adminRef, {
        isActive: !currentStatus,
      });
    } catch (error) {
      console.error('Error updating admin status:', error);
      alert('Failed to update admin status');
    } finally {
      setUpdatingUserId(null);
    }
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

  // Get role badge color
  const getRoleColor = (role: AdminUser['role']) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-100 text-purple-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      case 'viewer':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format role for display
  const formatRole = (role: AdminUser['role']) => {
    return role.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Count permissions
  const countActivePermissions = (permissions: AdminUser['permissions']) => {
    return Object.values(permissions).filter(Boolean).length;
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
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Users</h1>
            <p className="text-gray-600 mt-1">Manage admin accounts and permissions</p>
          </div>
          <Link
            href="/settings/admins/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + Add Admin User
          </Link>
        </div>
      </div>

      {/* Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Total Admins</div>
          <div className="text-2xl font-bold text-gray-900 mt-2">{adminUsers.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Active</div>
          <div className="text-2xl font-bold text-green-600 mt-2">
            {adminUsers.filter((a) => a.isActive).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Super Admins</div>
          <div className="text-2xl font-bold text-purple-600 mt-2">
            {adminUsers.filter((a) => a.role === 'super_admin').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Inactive</div>
          <div className="text-2xl font-bold text-red-600 mt-2">
            {adminUsers.filter((a) => !a.isActive).length}
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
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filters Row */}
          <div className="flex gap-4 flex-wrap items-center">
            {/* Role Filter */}
            <div className="flex gap-2">
              <span className="text-sm font-medium text-gray-700 self-center mr-2">Role:</span>
              {(['all', 'super_admin', 'admin', 'viewer'] as const).map((role) => (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role)}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    roleFilter === role
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {role === 'all' ? 'All' : formatRole(role)}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <div className="flex gap-2">
              <span className="text-sm font-medium text-gray-700 self-center mr-2">Status:</span>
              {(['all', 'active', 'inactive'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1 rounded-md text-sm font-medium capitalize ${
                    statusFilter === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mt-3 text-sm text-gray-600">
          Showing {filteredAdminUsers.length} of {adminUsers.length} admin users
        </div>
      </div>

      {/* Admin Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permissions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAdminUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
                      ? 'No admin users match your filters'
                      : 'No admin users yet. Create your first admin user to get started.'}
                  </td>
                </tr>
              ) : (
                filteredAdminUsers.map((admin) => (
                  <tr key={admin.uid} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {admin.firstName} {admin.lastName}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{admin.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleColor(
                          admin.role
                        )}`}
                      >
                        {formatRole(admin.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {countActivePermissions(admin.permissions)} of 4 enabled
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(admin.lastLoginAt)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleAdminStatus(admin.uid, admin.isActive)}
                        disabled={updatingUserId === admin.uid}
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          admin.isActive
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        } ${updatingUserId === admin.uid ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        {updatingUserId === admin.uid
                          ? 'Updating...'
                          : admin.isActive
                          ? 'Active'
                          : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <Link
                        href={`/settings/admins/${admin.uid}/edit`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </Link>
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
