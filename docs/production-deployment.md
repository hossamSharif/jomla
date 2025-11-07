# Production Deployment Guide

Complete guide for deploying Jomla Grocery Store application to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Firebase Project Setup](#firebase-project-setup)
4. [Mobile App Deployment](#mobile-app-deployment)
5. [Admin Dashboard Deployment](#admin-dashboard-deployment)
6. [Cloud Functions Deployment](#cloud-functions-deployment)
7. [Post-Deployment Checklist](#post-deployment-checklist)
8. [Monitoring and Maintenance](#monitoring-and-maintenance)

## Prerequisites

### Required Accounts
- Firebase/Google Cloud account with billing enabled
- Expo/EAS account (for mobile builds)
- Apple Developer account (for iOS deployment)
- Google Play Console account (for Android deployment)

### Required Tools
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Install EAS CLI
npm install -g eas-cli

# Verify installations
firebase --version
eas --version
```

## Environment Configuration

### 1. Create Production Environment Files

#### Mobile App (`.env.production`)
```bash
# mobile/.env.production
EXPO_PUBLIC_ENV=production
EXPO_PUBLIC_FIREBASE_API_KEY=your_production_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

#### Admin Dashboard (`.env.production.local`)
```bash
# admin/.env.production.local
NEXT_PUBLIC_FIREBASE_API_KEY=your_production_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin SDK (server-side only, never expose to client)
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

#### Cloud Functions (`.env`)
```bash
# functions/.env
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_VERIFY_SERVICE_SID=your_verify_service_sid

# Optional: External APIs
STRIPE_SECRET_KEY=your_stripe_key
SENDGRID_API_KEY=your_sendgrid_key
```

### 2. Secure Secrets Management

**NEVER** commit these files to Git:
```bash
# Verify .gitignore includes:
*.env
*.env.local
*.env.production
*.env.production.local
firebase-service-account.json
```

**Use environment variables in CI/CD**:
- Store secrets in GitHub Secrets
- Use Firebase environment variables for functions

## Firebase Project Setup

### 1. Create Production Firebase Project

```bash
# Login to Firebase
firebase login

# Create new project (via Firebase Console)
# https://console.firebase.google.com/

# Initialize in your project
firebase use --add
# Select your production project
# Alias: production
```

### 2. Enable Required Services

In Firebase Console:
- ✅ Authentication (Email/Password)
- ✅ Firestore Database
- ✅ Cloud Storage
- ✅ Cloud Functions
- ✅ Cloud Messaging (FCM)
- ✅ Hosting (for admin dashboard)
- ✅ Analytics (optional)

### 3. Configure Firestore

```bash
# Deploy Firestore rules and indexes
firebase deploy --only firestore --project production
```

### 4. Configure Storage

```bash
# Deploy Storage rules
firebase deploy --only storage --project production
```

### 5. Setup Authentication

1. Enable Email/Password auth in Firebase Console
2. Configure authorized domains:
   - your-domain.com
   - your-admin-domain.com
   - localhost (for testing)

## Mobile App Deployment

### 1. Update app.json

```json
{
  "expo": {
    "name": "Jomla Grocery Store",
    "slug": "jomla-grocery",
    "version": "1.0.0",
    "extra": {
      "eas": {
        "projectId": "your-eas-project-id"
      }
    }
  }
}
```

### 2. Configure EAS

```bash
cd mobile

# Login to Expo
eas login

# Configure project
eas build:configure
```

### 3. Build for Production

**Android**:
```bash
# Build AAB for Google Play
eas build --platform android --profile production

# Build APK for testing
eas build --platform android --profile production --build-type apk
```

**iOS**:
```bash
# Build for App Store
eas build --platform ios --profile production
```

### 4. Submit to Stores

**Google Play**:
```bash
eas submit --platform android --profile production
```

**App Store**:
```bash
eas submit --platform ios --profile production
```

## Admin Dashboard Deployment

### 1. Build Admin Dashboard

```bash
cd admin

# Install dependencies
npm ci

# Build for production
npm run build
```

### 2. Deploy to Firebase Hosting

```bash
# Deploy from root directory
firebase deploy --only hosting --project production
```

### 3. Configure Custom Domain (Optional)

1. Go to Firebase Console → Hosting
2. Add custom domain
3. Update DNS records
4. Wait for SSL certificate provisioning

## Cloud Functions Deployment

### 1. Configure Functions Runtime

```bash
cd functions

# Install dependencies
npm ci

# Build functions
npm run build
```

### 2. Set Environment Variables

```bash
# Set Twilio credentials
firebase functions:config:set \
  twilio.account_sid="your_sid" \
  twilio.auth_token="your_token" \
  twilio.phone_number="+1234567890" \
  --project production

# View current config
firebase functions:config:get --project production
```

### 3. Deploy Functions

```bash
# Deploy all functions
firebase deploy --only functions --project production

# Deploy specific function
firebase deploy --only functions:sendVerificationCode --project production
```

## Post-Deployment Checklist

### Security

- [ ] Firestore security rules deployed and tested
- [ ] Storage security rules deployed and tested
- [ ] Admin custom claims configured
- [ ] API rate limiting enabled
- [ ] CORS configured for functions
- [ ] Environment variables secured

### Testing

- [ ] Register new user via mobile app
- [ ] Verify SMS verification works
- [ ] Login to admin dashboard
- [ ] Create test product
- [ ] Create test offer
- [ ] Place test order (delivery)
- [ ] Place test order (pickup)
- [ ] Verify push notifications
- [ ] Test invoice generation

### Monitoring

- [ ] Firebase Console dashboards configured
- [ ] Cloud Functions logs enabled
- [ ] Error reporting configured
- [ ] Analytics tracking verified
- [ ] Performance monitoring enabled

### Documentation

- [ ] Admin user manual distributed
- [ ] Mobile app user guide published
- [ ] API documentation updated
- [ ] Deployment runbook created

## Monitoring and Maintenance

### Firebase Console Monitoring

1. **Functions Dashboard**: Monitor invocations, errors, execution time
2. **Firestore Usage**: Track reads, writes, deletes
3. **Storage**: Monitor upload/download bandwidth
4. **Authentication**: Track active users, sign-ups
5. **Hosting**: Monitor bandwidth and requests

### Log Monitoring

```bash
# View Cloud Functions logs
firebase functions:log --project production

# Filter specific function
firebase functions:log --only sendVerificationCode --project production

# Real-time logs
firebase functions:log --project production --follow
```

### Performance Monitoring

Enable Firebase Performance Monitoring:
1. Add Performance SDK to mobile app
2. Monitor app startup time
3. Track custom traces for critical flows
4. Monitor network requests

### Cost Monitoring

Set up billing alerts:
1. Go to Google Cloud Console
2. Billing → Budgets & alerts
3. Set thresholds for:
   - Cloud Functions invocations
   - Firestore operations
   - Storage bandwidth
   - Cloud Messaging

### Regular Maintenance

**Weekly**:
- Review error logs
- Check function performance
- Monitor storage usage

**Monthly**:
- Review security rules
- Update dependencies
- Check for Firebase SDK updates
- Review and optimize database indexes

**Quarterly**:
- Security audit
- Performance optimization
- Cost analysis
- User feedback review

## Rollback Procedures

### Functions Rollback

```bash
# List function versions
firebase functions:list --project production

# Rollback specific function
firebase functions:delete functionName --project production
# Then redeploy previous version
```

### Admin Dashboard Rollback

```bash
# View hosting releases
firebase hosting:releases:list --project production

# Rollback to previous release
firebase hosting:rollback --project production
```

### Mobile App Rollback

- Contact app stores for emergency takedown
- Push OTA update via EAS Update:
  ```bash
  eas update --branch production --message "Emergency rollback"
  ```

## Troubleshooting

### Common Issues

**Functions Cold Start Time High**:
- Increase function memory allocation
- Enable min instances for critical functions
- Use function bundling to reduce code size

**Firestore Read/Write Costs High**:
- Review and optimize queries
- Implement client-side caching
- Use compound indexes
- Denormalize data where appropriate

**Mobile App Crashes**:
- Check Crashlytics logs
- Review recent function deployments
- Test with production data
- Enable debug mode temporarily

### Support Contacts

- Firebase Support: https://firebase.google.com/support
- Expo Support: https://expo.dev/support
- Twilio Support: https://www.twilio.com/help

## Resources

- [Firebase Production Best Practices](https://firebase.google.com/support/guides/production-checklist)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Cloud Functions Best Practices](https://firebase.google.com/docs/functions/best-practices)
