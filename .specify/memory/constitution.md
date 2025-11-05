<!--
SYNC IMPACT REPORT
==================
Version Change: [Unversioned Template] → 1.0.0
Constitution Status: NEW - First ratification of Jomla project constitution

Added Sections:
- I. UI Component Standards (shadcn/ui for admin dashboard)
- II. Mobile Development Best Practices (React Native + Expo)
- III. Cross-Platform Consistency (iOS & Android parity)
- IV. Firebase-First Architecture (Firestore, Auth, Cloud Functions)
- V. Type Safety (TypeScript strict mode across all projects)
- VI. Testing Requirements (Jest + Testing Library + Firebase Emulator)

Templates Requiring Updates:
✅ plan-template.md - Constitution Check section updated to reference new principles
✅ spec-template.md - No updates required (technology-agnostic by design)
✅ tasks-template.md - No updates required (follows plan structure)
✅ checklist-template.md - No updates required (follows feature context)
✅ agent-file-template.md - No updates required (uses plan.md as source)

Follow-up TODOs: None

Rationale for Version 1.0.0:
- MAJOR version (1.x.x): First formal constitution ratification establishing foundational governance
-->

# Jomla Project Constitution

## Core Principles

### I. UI Component Standards

When working with the admin dashboard web application, shadcn/ui MCP tools MUST be used for all UI components. This ensures:
- Consistent design language across the admin interface
- Accessibility compliance out of the box
- Type-safe component integration with TypeScript
- Reduced custom styling overhead

**Rationale**: shadcn/ui provides a curated, well-tested component library that integrates seamlessly with the Next.js + Tailwind CSS stack, reducing development time and ensuring consistent UX.

### II. Mobile Development Best Practices

All mobile application development MUST follow React Native and Expo best practices, including:
- Use Expo SDK 50+ managed workflow for faster development and OTA updates
- Implement proper navigation patterns using Expo Router
- Follow React hooks and functional component patterns
- Use zustand for state management and @tanstack/react-query for data fetching
- Optimize performance with memoization (useMemo, useCallback) for complex lists
- Handle offline scenarios gracefully with proper error boundaries

**Rationale**: React Native and Expo provide a proven, cross-platform mobile development framework that enables code reuse while maintaining native performance and capabilities.

### III. Cross-Platform Consistency (iOS & Android)

Mobile features MUST be designed and tested for both iOS and Android platforms with equal consideration:
- UI layouts must adapt to platform-specific design guidelines (iOS Human Interface Guidelines, Material Design)
- Handle platform-specific behaviors (navigation gestures, status bar, safe areas)
- Test critical flows on both platforms before marking features complete
- Use platform-agnostic APIs when available, platform-specific only when necessary
- Ensure push notifications work on both FCM (Android) and APNs (iOS)

**Rationale**: Users on both platforms deserve an equally polished experience. Platform-specific quirks must be identified and handled early to avoid costly rework.

### IV. Firebase-First Architecture

Backend services MUST leverage Firebase as the primary infrastructure:
- **Firestore**: Primary database for all application data
- **Firebase Auth**: User authentication and session management
- **Cloud Functions**: Server-side business logic (TypeScript/Node.js 18+)
- **Firebase Storage**: Product images and assets
- **Firebase Cloud Messaging**: Push notifications
- All prices MUST be stored in cents (integers) to avoid floating-point errors
- Use Firestore transactions for critical operations (cart checkout, inventory updates)
- Enable offline persistence for mobile app
- Denormalize data for read performance where appropriate (avoid excessive joins)

**Rationale**: Firebase provides a cohesive, scalable backend infrastructure that handles real-time synchronization, authentication, and serverless functions, allowing the team to focus on business logic rather than infrastructure management.

### V. Type Safety (NON-NEGOTIABLE)

TypeScript MUST be used across all projects with strict mode enabled:
- All new code MUST have explicit types (no implicit `any`)
- Use interfaces for data models defined in `shared/types/`
- Components MUST have typed props
- API contracts MUST have TypeScript interfaces
- Cloud Functions MUST have typed request/response interfaces
- Prefer type inference over explicit types where clear

**Rationale**: Type safety catches errors at compile time, improves IDE autocomplete, serves as living documentation, and makes refactoring safer across the monorepo.

### VI. Testing Requirements

Testing is mandatory for critical business logic:
- **Mobile**: Jest + React Native Testing Library for component and integration tests
- **Admin**: Jest + React Testing Library for component and integration tests
- **Cloud Functions**: Jest + Firebase Emulator Suite for backend logic
- Test files co-located with source (`__tests__/` directories)
- Test coverage expected for: authentication flows, cart logic, order processing, invoice generation
- Use Firebase Emulator Suite for local development and testing (avoid hitting production services)

**Rationale**: Testing ensures reliability for critical user flows (authentication, payments, orders) and prevents regressions when refactoring. The Firebase Emulator Suite enables fast, cost-free testing without affecting production data.

## Security & Data Integrity

**Defense in Depth**: Validation MUST occur at three levels:
1. Client-side validation (UX - immediate feedback)
2. Cloud Functions validation (security - enforce business rules)
3. Firestore rules validation (defense - database-level protection)

**Sensitive Data**: Never store sensitive data in Firestore; passwords are handled exclusively by Firebase Auth. Use custom claims for admin roles.

**Price Integrity**: All prices stored in cents (integers) to avoid floating-point arithmetic errors.

## Development Workflow

**Code Organization**:
- Functional components with hooks (no class components)
- Keep components small and focused (single responsibility)
- Extract reusable logic into custom hooks
- Use service layers (`services/`) for Firebase interactions

**Firebase Development**:
- Always develop against Firebase Emulator Suite locally
- Test Firestore rules with emulator before deploying
- Use indexed queries (define in `firestore.indexes.json`)
- Monitor Cloud Functions cold start times and optimize bundle size

**Mobile Development**:
- Test on both physical iOS and Android devices before release
- Use Expo Go for rapid development iteration
- Build standalone apps (EAS Build) for production releases
- Handle push notification permissions properly on both platforms

## Governance

This constitution supersedes all other practices and serves as the authoritative source for project standards.

**Amendment Process**:
- Amendments require documentation of the rationale
- Version must be incremented according to semantic versioning
- All templates and dependent documentation must be updated
- Team approval required for MAJOR version changes

**Compliance Review**:
- All PRs must verify compliance with constitution principles
- Constitution Check in `plan.md` must pass before implementation begins
- Violations must be justified in the Complexity Tracking section
- Use `CLAUDE.md` (generated from `agent-file-template.md`) for runtime development guidance

**Version**: 1.0.0 | **Ratified**: 2025-11-05 | **Last Amended**: 2025-11-05
