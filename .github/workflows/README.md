# GitHub Actions CI/CD Workflows

This directory contains automated workflows for continuous integration and deployment.

## Workflows

### 1. CI (Continuous Integration) - `ci.yml`

**Trigger**: Pull requests and pushes to `master`, `main`, or `develop` branches

**Jobs**:
- **mobile-lint**: Lint and type-check mobile app
- **admin-lint**: Lint, type-check, and build admin dashboard
- **functions-lint**: Lint, type-check, and build Cloud Functions
- **firebase-rules-check**: Validate Firestore security rules
- **security-scan**: Run npm audit on all packages

### 2. Deploy (Continuous Deployment) - `deploy.yml`

**Trigger**: Push to `master`/`main` or manual workflow dispatch

**Jobs**:
- **deploy-functions**: Deploy Cloud Functions to Firebase
- **deploy-admin**: Build and deploy admin dashboard to Firebase Hosting
- **deploy-firestore**: Deploy Firestore rules and indexes
- **deploy-storage**: Deploy Storage rules

### 3. Mobile App Build - `mobile-build.yml`

**Trigger**: Manual workflow dispatch only

**Jobs**:
- **build-android**: Build Android app using EAS
- **build-ios**: Build iOS app using EAS

## Setup Instructions

### Required Secrets

Configure these secrets in your GitHub repository settings:
**Settings → Secrets and variables → Actions → New repository secret**

#### Firebase Secrets

1. **FIREBASE_TOKEN**
   ```bash
   # Login to Firebase CLI
   firebase login:ci

   # Copy the token and add it as a secret
   ```

2. **FIREBASE_PROJECT_ID**
   - Your Firebase project ID (e.g., `jomla-grocery-store`)

#### Admin Dashboard Environment Variables

3. **NEXT_PUBLIC_FIREBASE_API_KEY**
4. **NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN**
5. **NEXT_PUBLIC_FIREBASE_PROJECT_ID**
6. **NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET**
7. **NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID**
8. **NEXT_PUBLIC_FIREBASE_APP_ID**

   *Get these from Firebase Console → Project Settings → Your apps → Web app config*

#### Expo/EAS Secrets (for mobile builds)

9. **EXPO_TOKEN**
   ```bash
   # Login to Expo
   npx expo login

   # Generate token
   npx expo token:create

   # Copy the token and add it as a secret
   ```

### Environment Configuration

To use multiple environments (staging, production):

1. **Create GitHub Environments**:
   - Go to **Settings → Environments**
   - Create `staging` and `production` environments
   - Add environment-specific secrets

2. **Configure Firebase Projects**:
   ```bash
   # Add staging project
   firebase projects:add staging-project-id

   # Add production project
   firebase projects:add production-project-id
   ```

3. **Update deploy.yml** to use environment-specific project IDs

## Usage

### Running CI

CI runs automatically on every pull request and push to protected branches.

**Manually trigger CI**:
```bash
git push origin feature-branch
# Open pull request
```

### Deploying to Production

**Automatic** (on push to master/main):
```bash
git checkout master
git merge feature-branch
git push origin master
# Deployment starts automatically
```

**Manual**:
1. Go to **Actions** tab in GitHub
2. Select **Deploy** workflow
3. Click **Run workflow**
4. Select environment (staging/production)
5. Click **Run workflow**

### Building Mobile App

**Build Android (Production)**:
1. Go to **Actions** tab
2. Select **Mobile App Build** workflow
3. Click **Run workflow**
4. Platform: `android`
5. Profile: `production`
6. Click **Run workflow**

**Build iOS (Production)**:
1. Same as above, but select `ios` platform

**Build Both Platforms**:
1. Select platform: `all`

## Workflow Status Badges

Add these badges to your README.md:

```markdown
![CI](https://github.com/YOUR_USERNAME/Jomla/workflows/CI/badge.svg)
![Deploy](https://github.com/YOUR_USERNAME/Jomla/workflows/Deploy/badge.svg)
```

## Troubleshooting

### Firebase Deployment Fails

**Error**: "Unauthenticated access"
- Check that `FIREBASE_TOKEN` secret is set correctly
- Regenerate token: `firebase login:ci`

**Error**: "Project not found"
- Verify `FIREBASE_PROJECT_ID` secret matches your project

### Admin Build Fails

**Error**: "Environment variable not set"
- Check all `NEXT_PUBLIC_*` secrets are configured

### EAS Build Fails

**Error**: "Invalid Expo token"
- Regenerate Expo token
- Verify `EXPO_TOKEN` secret is set

**Error**: "Unable to find iOS credentials"
- Add credentials to EAS: `eas credentials`

### Firestore Rules Validation Fails

- Check `firebase/firestore.rules` syntax
- Test locally: `firebase emulators:start`

## Best Practices

### Branch Protection

Require CI to pass before merging:
1. **Settings → Branches**
2. Add rule for `master` branch
3. Enable "Require status checks to pass"
4. Select CI jobs as required

### Deployment Approval

For production deployments:
1. **Settings → Environments → production**
2. Enable "Required reviewers"
3. Add team members who can approve

### Secrets Rotation

Rotate secrets regularly:
- Firebase token: Every 6 months
- Expo token: Every 6 months
- Review and update API keys

### Monitoring

Monitor workflow runs:
- **Actions** tab shows all workflow runs
- Set up email notifications: **Settings → Notifications**
- Review failed runs and fix issues promptly

## Advanced Configuration

### Caching Dependencies

Workflows use npm caching for faster builds:
```yaml
- uses: actions/setup-node@v4
  with:
    cache: 'npm'
    cache-dependency-path: ./mobile/package-lock.json
```

### Parallel Jobs

Jobs run in parallel by default for faster CI:
- mobile-lint, admin-lint, functions-lint run simultaneously
- deployment jobs can be made dependent if needed

### Custom Triggers

Add custom triggers to workflows:
```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # Run daily at 2 AM
  repository_dispatch:
    types: [deploy-requested]
```

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Firebase CI/CD](https://firebase.google.com/docs/hosting/github-integration)
- [EAS Build with GitHub Actions](https://docs.expo.dev/build/building-on-ci/)
