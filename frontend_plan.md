# Pulse Frontend Project Plan

Based on the detailed requirements in `project_specs.md`, this plan outlines the frontend development steps for the React Native app. Each step focuses on frontend implementation, with comments for the backend team on what APIs or features need to be available for the frontend to work properly.

Since we already have the basic project scaffolded (navigation, state management, testing, etc.), we'll continue from there.

## Phase 1: Authentication Flows

### Step 1.1: Implement Register/Login Screens
- Create `src/screens/LoginScreen.tsx` and `src/screens/RegisterScreen.tsx`.
- Add forms with email/password fields using react-native-paper components.
- Integrate with API endpoints for login/register (backend comment: ensure POST /auth/login and POST /auth/register endpoints return JWT tokens and user data).
- Handle loading states and error messages.
- Update navigation to show auth screens if not logged in.

**Backend requirement**: API endpoints for auth (register, login, verify email).

### Step 1.2: Implement Email Verification UI
- Add email verification screen `src/screens/EmailVerificationScreen.tsx`.
- Show verification status and resend option.
- Integrate with backend endpoint for resending verification.

**Backend requirement**: Endpoint for resending email verification.

## Phase 2: State Management & Data Fetching

### Step 2.1: Set Up Redux Toolkit & React Query
- We already have Redux Toolkit set up; add auth slice for user state.
- Persist auth state using @react-native-async-storage/async-storage.
- Set up React Query for API data fetching (already integrated in App.tsx).

**Backend requirement**: None, but ensure API responses are consistent.

### Step 2.2: Implement User Profile Management
- Create `src/screens/ProfileScreen.tsx` (already exists, enhance it).
- Add edit profile functionality with avatar upload.
- Integrate with backend user profile endpoints.

**Backend requirement**: GET/POST /users/profile for getting/updating user data, presigned URLs for avatar upload.

## Phase 3: Dashboard & Chats Overview

### Step 3.1: Implement Dashboard Screen
- Enhance `src/screens/HomeScreen.tsx` to show recent chats/groups.
- Add list of chats with last message preview.
- Use mock data initially, then connect to API.

**Backend requirement**: GET /chats for fetching user's chats (DMs and groups).

### Step 3.2: Implement Chat List Item Component
- Create `src/components/ChatListItem.tsx`.
- Display chat name, last message, timestamp, unread count.

**Backend requirement**: None additional.

## Phase 4: Real-time Messaging

### Step 4.1: Set Up Socket Manager
- Create `src/utils/socketManager.ts` for socket.io-client.
- Connect on login, handle auth with JWT.
- Listen for incoming messages.

**Backend requirement**: Socket.io server with auth middleware, message events.

### Step 4.2: Implement Chat Screen
- Create `src/screens/ChatScreen.tsx`.
- Display message list with infinite scroll (using React Query).
- Add message input with send button.
- Implement optimistic updates for sent messages.

**Backend requirement**: Socket events for send/receive messages, GET /messages for history.

## Phase 5: Attachments & Media

### Step 5.1: Implement File Uploads
- Add attachment picker in ChatScreen (images, audio, location).
- Integrate with backend presigned URLs for uploads.

**Backend requirement**: Presigned upload URLs, attachment processing jobs if needed.

### Step 5.2: Implement Location Sharing
- Add location picker using react-native-maps or similar.
- Show map preview in messages.

**Backend requirement**: None additional.

## Phase 6: Groups & Membership

### Step 6.1: Implement Group Creation
- Create `src/screens/CreateGroupScreen.tsx`.
- Add group name, privacy settings, invite members.

**Backend requirement**: POST /groups for creating groups, POST /groups/:id/invite for inviting members.

### Step 6.2: Implement Group Management
- Enhance ProfileScreen or add separate screen for group settings.
- Handle join/leave groups, role management.

**Backend requirement**: GET /groups/:id, POST /groups/:id/join, DELETE /groups/:id/leave.

## Phase 7: Push Notifications & Advanced Features

### Step 7.1: Integrate Push Notifications
- Set up FCM for push notifications.
- Register push token on login.

**Backend requirement**: FCM integration for sending pushes on new messages.

### Step 7.2: Implement Read Receipts & Presence
- Add read receipts in ChatScreen.
- Show online status in chat lists.

**Backend requirement**: Socket events for read receipts, presence updates.

## Phase 8: Testing & Quality

### Step 8.1: Add Tests for New Features
- Add unit tests for screens and components.
- Integration tests for API calls and socket events.

### Step 8.2: Run Quality Gates
- Ensure all tests pass, linting, TypeScript checks.

## Phase 9: Deployment & Documentation

### Step 9.1: Update README
- Add instructions for running the full app.
- Include backend setup steps.

### Step 9.2: Deploy Frontend
- Build for Android/iOS.
- Set up CI/CD if needed.

This plan can be executed step by step. Start with Phase 1 and proceed sequentially, ensuring backend APIs are ready for each frontend step.
