# Backend Team - Essential APIs & Socket Events Request

## Document Overview

This document lists the **essential** REST API endpoints and Socket.IO events needed for basic messaging functionality (text, attachments, location). Advanced features like calls, reactions, and status updates will be implemented in future phases.

**Scope:** Basic text messaging, file attachments, location sharing, and core chat management  
**Date:** October 14, 2025  
**Prepared by:** Frontend Team  
**For:** Backend Development Team

---

## Table of Contents

1. [Authentication APIs](#authentication-apis)
2. [Chats APIs](#chats-apis)
3. [Groups APIs](#groups-apis)
4. [Socket.IO Real-time Events](#socketio-real-time-events)
5. [Implementation Priority](#implementation-priority)
6. [Questions for Backend Team](#questions-for-backend-team)

---

## Authentication APIs

### Essential Endpoints

#### 1. Resend Email Verification OTP
- **Endpoint:** `POST /api/auth/resend-verification`
- **Description:** Request new OTP if user didn't receive initial one
- **Request:** `{ "email": "string" }`
- **Response:** `{ "message": "Verification code sent" }`
- **Notes:** Rate limit 3 requests/hour, invalidate previous OTP

#### 2. Logout (Revoke Refresh Token)
- **Endpoint:** `POST /api/auth/logout`
- **Description:** Invalidate refresh token on server
- **Request:** `{ "refreshToken": "string", "deviceId": "string" }`
- **Response:** `{ "message": "Logged out successfully" }`
- **Notes:** Remove device session from database

#### 3. Forgot Password
- **Endpoint:** `POST /api/auth/forgot-password`
- **Request:** `{ "email": "string" }`
- **Notes:** Send 6-digit OTP, expires in 10 minutes

#### 4. Reset Password
- **Endpoint:** `POST /api/auth/reset-password`
- **Request:** `{ "email": "string", "otp": "string", "newPassword": "string" }`
- **Notes:** Invalidate all refresh tokens after reset

#### 5. Change Password
- **Endpoint:** `POST /api/auth/change-password`
- **Request:** `{ "currentPassword": "string", "newPassword": "string" }`
- **Notes:** Verify current password first

---

## Chats APIs

### Essential Endpoints

#### 1. Search Users
- **Endpoint:** `GET /api/users/search?q={query}&limit={limit}`
- **Description:** Search users to start DM conversation
- **Response:** `{ "users": [{ "id", "name", "email", "avatar", "isOnline" }] }`
- **Notes:** Min 2 characters, exclude current user, rate limit 10/min
- **Use Case:** When user taps "New Chat" button

#### 2. Get Group Members
- **Endpoint:** `GET /api/chats/:chatId/members`
- **Description:** List all members in a group with full details
- **Response:** `{ "members": [{ "id", "name", "email", "avatar", "role", "joinedAt", "isOnline" }] }`
- **Notes:** Include role, join date, online status
- **Use Case:** Display group members in group info screen

#### 3. Update Group Details
- **Endpoint:** `PATCH /api/chats/:chatId`
- **Request:** `{ "name": "string", "description": "string", "avatar": "string" }`
- **Notes:** Admin only, broadcast via Socket.IO
- **Use Case:** Edit group name/description/avatar

#### 4. Promote/Demote Member
- **Endpoint:** `PATCH /api/chats/:chatId/members/:memberId`
- **Request:** `{ "role": "ADMIN" | "MEMBER" }`
- **Notes:** Cannot demote last admin
- **Use Case:** Manage group admins

### Enhancement: GET /api/chats Response

**Add these fields to existing response for better UX:**
- `lastMessageSender`: string (name of sender)
- `memberCount`: number (for groups)
- `role`: "ADMIN" | "MEMBER" (for groups, user's role)

---

## Groups APIs

### Essential Enhancement

#### Get Members with Full User Details
- **Current:** Members only have `userId`, `role`, `joinedAt`
- **Needed:** Full user details (name, email, avatar, isOnline)
- **Solution:** Expand members in GET /api/groups/:groupId response OR add dedicated endpoint
- **Use Case:** Display member list with names and avatars in group settings

---

## Socket.IO Real-time Events

### Essential Events

#### 1. Message Editing
- **C→S:** `message:edit` - `{ messageId, content, conversationId?, groupId? }`
- **S→C:** `message:edited` - `{ messageId, content, editedAt, conversationId?, groupId? }`
- **Notes:** 15-minute time limit, show "edited" indicator
- **Use Case:** Allow users to fix typos or update message content

#### 2. Message Deletion
- **C→S:** `message:delete` - `{ messageId, conversationId?, groupId?, deleteForEveryone? }`
- **S→C:** `message:deleted` - `{ messageId, deletedBy, deletedAt, deleteForEveryone }`
- **Notes:** 1-hour time limit for "delete for everyone"
- **Use Case:** Remove messages sent by mistake

#### 3. Bulk Read Receipts
- **Enhancement:** Accept array of messageIds in `message:read`
- **Current:** `{ messageId, targetUserId?, groupId? }`
- **Suggested:** `{ messageIds: [], targetUserId?, groupId?, readAt? }`
- **Benefit:** Mark all unread messages at once when opening chat
- **Use Case:** Efficiently mark multiple messages as read

#### 4. File Upload Progress
- **S→C Events:** `upload:progress`, `upload:complete`, `upload:failed`
- **Progress:** `{ uploadId, fileName, progress, bytesUploaded, totalBytes }`
- **Complete:** `{ uploadId, fileName, mediaUrl, fileSize }`
- **Use Case:** Show progress bar when uploading images/videos/files

#### 5. Group Member Events
- **S→C:** `group:member:added`, `group:member:removed`, `group:member:role_changed`
- **Example:** `{ groupId, userId, addedBy, role }`
- **Use Case:** Real-time updates when members are added/removed from groups

#### 6. Group Details Updated
- **S→C:** `group:updated` - `{ groupId, name?, description?, avatarUrl?, updatedBy }`
- **Use Case:** Real-time updates when group name/description/avatar changes

### Recommended Enhancements

#### 1. Typing with User Info
- **Enhancement:** Add `userName` to typing events
- **Current:** `{ userId, conversationId?, groupId? }`
- **Suggested:** `{ userId, userName, conversationId?, groupId? }`
- **Benefit:** Show "John is typing..." instead of "Someone is typing..."

#### 2. Message Ack with Retry
- **Enhancement:** Add retry mechanism for failed messages
- **Suggested:** Add `retryCount`, `retryAfter` to acknowledgment
- **Status:** `'ok' | 'error' | 'retry'`
- **Benefit:** Better handling of network issues

---

## Implementation Priority

### Phase 1 (Week 1-2) - Critical for Basic Functionality
1. **Authentication:**
   - Resend Email Verification OTP
   - Logout (Revoke Refresh Token)
   - Forgot Password
   - Reset Password

2. **Chats:**
   - Search Users (for starting new DMs)
   - Get Group Members (with full user details)
   - Update Group Details
   - Promote/Demote Member

3. **Socket.IO:**
   - Message Editing
   - Message Deletion
   - Bulk Read Receipts
   - File Upload Progress
   - Group Member Events (added, removed, role changed)
   - Group Details Updated

4. **Groups:**
   - Expand members with full user details in GET /api/groups/:groupId

### Phase 2 (Week 3-4) - Important for Better UX
1. **Authentication:**
   - Change Password (for authenticated users)

2. **Chats:**
   - Enhancement: Add `lastMessageSender`, `memberCount`, `role` to GET /api/chats

3. **Socket.IO:**
   - Typing with User Info enhancement
   - Message Ack with Retry enhancement

---

## Questions for Backend Team

### Authentication
1. What are current ACCESS_TOKEN_TTL and REFRESH_TOKEN_TTL?
2. Is OTP expiration configurable? Current value (10 minutes)?
3. Can users access app without email verification?

### Chats & Groups
1. Can members add other members, or only admins?
2. Max group size (number of members)?
3. Soft-delete or hard-delete when user deletes a chat?
4. When a user leaves a group, are their messages retained?

### Messages & Real-time
1. Time limit for editing messages? (Suggested: 15 minutes)
2. Time limit for "delete for everyone"? (Suggested: 1 hour)
3. What happens to replies when original message is deleted?
4. Max file size for attachments?
5. Supported file types (images, videos, documents, audio)?
6. Are uploaded files stored permanently or with expiration?
7. Max users in a group?
8. Rate limits on Socket.IO events?

---

## Rate Limiting Recommendations

**Authentication:**
- `/auth/register`: 5 requests/hour per IP
- `/auth/login`: 10 requests/15 min per IP
- `/auth/resend-verification`: 3 requests/hour per email
- `/auth/forgot-password`: 3 requests/hour per email

**Chats:**
- `/users/search`: 10 requests/min per user
- `/chats/:id/members`: 30 requests/min per user

**Socket.IO:**
- Message send: 60 messages/min per user
- Typing indicators: 10 events/min per conversation
- File uploads: 10 uploads/min per user

---

## File Upload Specifications

**Recommended Limits:**
- Max file size: 25 MB
- Supported types:
  - Images: JPG, PNG, GIF, WEBP
  - Videos: MP4, MOV (max 25 MB)
  - Documents: PDF, DOC, DOCX, XLS, XLSX, TXT
  - Audio: MP3, M4A, WAV

**Upload Flow:**
1. Client uploads file to server endpoint (e.g., `POST /api/upload`)
2. Server returns `{ uploadId, mediaUrl }`
3. Server emits `upload:progress` events during upload
4. Server emits `upload:complete` when done
5. Client sends message with `mediaUrl` via Socket.IO

---

## Security Recommendations

1. Implement refresh token rotation (already done ✅)
2. Add IP address tracking for sessions
3. Add user agent tracking for device identification
4. Validate file types and scan for malware on upload
5. Implement rate limiting on all endpoints

---

## Contact

For questions or clarifications about this document, please reach out to the frontend team.

**Thank you!** 🙏
