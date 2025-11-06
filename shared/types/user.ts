/**
 * User Types
 *
 * Stores customer account information and authentication metadata.
 */

import { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string;                    // Firebase Auth UID (same as document ID)
  email: string;                  // Unique, used for login
  phoneNumber: string;            // E.164 format: +1234567890
  firstName: string;
  lastName: string;

  // Verification & Authentication
  isPhoneVerified: boolean;       // Account only active when true
  verificationCodeHash?: string;  // Hashed verification code (for password reset)
  verificationCodeExpiry?: Timestamp;  // Expires after 30 minutes
  verificationAttempts: number;   // Rate limiting: max 3 per hour
  lastVerificationRequest?: Timestamp;  // For rate limiting window

  // Session Management
  lastLoginAt?: Timestamp;
  sessionExpiresAt?: Timestamp;   // 30 days from last activity

  // Notifications
  fcmTokens: string[];            // Array of device tokens for push notifications

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AdminUser {
  uid: string;                    // Firebase Auth UID
  email: string;
  firstName: string;
  lastName: string;

  // Permissions
  role: 'super_admin' | 'admin' | 'viewer';
  permissions: {
    manageProducts: boolean;
    manageOffers: boolean;
    manageOrders: boolean;
    manageAdmins: boolean;        // Super admin only
  };

  // Status
  isActive: boolean;

  // Metadata
  createdAt: Timestamp;
  lastLoginAt?: Timestamp;
}
