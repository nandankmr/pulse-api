# Chats API - Frontend Integration Guide

## Overview

This document provides complete details for integrating the Chats API into your frontend application. All information is based on the actual backend implementation.

---

## ✅ Endpoint Confirmation

**YES, the endpoint EXISTS and is IMPLEMENTED:**

```
GET /api/chats
```

**Full URL:** `http://localhost:3000/api/chats`

**Status:** ✅ Fully implemented and production-ready

---

## 1. Get User's Chat List

### Endpoint

**GET** `/api/chats`

Retrieves all chats (both DMs and group chats) for the authenticated user.

### Authentication

**Required:** ✅ Yes

```
Authorization: Bearer <access_token>
```

### Request

```http
GET /api/chats HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Response Structure

**Status:** `200 OK`

**Content-Type:** `application/json`

```typescript
{
  chats: Array<{
    id: string;              // Chat ID (UUID)
    name: string;            // Chat name (user name for DMs, group name for groups)
    avatar?: string;         // Avatar URL (optional)
    lastMessage: string;     // Last message content
    timestamp: string;       // ISO 8601 timestamp of last activity
    unreadCount: number;     // Number of unread messages
    isGroup: boolean;        // true for groups, false for DMs
    isOnline?: boolean;      // Online status (only for DMs, currently always false)
  }>
}
```

### TypeScript Interface

```typescript
interface ChatsResponse {
  chats: Chat[];
}

interface Chat {
  id: string;
  name: string;
  avatar?: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isGroup: boolean;
  isOnline?: boolean;
}
```

### Example Response

```json
{
  "chats": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "avatar": "/uploads/avatars/john-avatar.jpg",
      "lastMessage": "Hey, how are you?",
      "timestamp": "2024-10-14T10:30:00.000Z",
      "unreadCount": 3,
      "isGroup": false,
      "isOnline": false
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Project Team",
      "avatar": "/uploads/avatars/team-avatar.jpg",
      "lastMessage": "Meeting at 3 PM",
      "timestamp": "2024-10-14T09:15:00.000Z",
      "unreadCount": 0,
      "isGroup": true
    },
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "name": "Jane Smith",
      "avatar": null,
      "lastMessage": "",
      "timestamp": "2024-10-13T18:45:00.000Z",
      "unreadCount": 0,
      "isGroup": false,
      "isOnline": false
    }
  ]
}
```

### Response Details

- **Sorted by timestamp** (most recent first)
- **Includes both DMs and groups** in a single array
- **Empty lastMessage** for chats with no messages yet
- **Avatar is optional** - can be `undefined` or omitted
- **isOnline is optional** - only present for DMs (currently always `false`, presence system not implemented yet)
- **Chats are sorted** by most recent activity (timestamp descending)

---

## 2. Get Specific Chat by ID

### Endpoint

**GET** `/api/chats/:chatId`

Retrieves details for a specific chat.

### Authentication

**Required:** ✅ Yes

### URL Parameters

- `chatId` (string, required): Chat ID (UUID)

### Response

**Status:** `200 OK`

Returns a single `Chat` object with the same structure as above.

---

## 3. Create New Chat

### Endpoint

**POST** `/api/chats`

Creates a new chat (DM or group).

### Authentication

**Required:** ✅ Yes

### Request Body

**For Direct Message:**
```json
{
  "recipientId": "user-uuid-123"
}
```

**For Group Chat:**
```json
{
  "groupName": "Project Team",
  "memberIds": ["user-uuid-1", "user-uuid-2", "user-uuid-3"]
}
```

### Validation Rules

- **Either** `recipientId` (for DM) **OR** `groupName` (for group) is required
- **Cannot specify both** `recipientId` and `groupName`
- For groups, `memberIds` array is optional (creator is automatically added)

### Response

**Status:** `201 Created`

```json
{
  "chat": {
    "id": "new-chat-uuid",
    "name": "John Doe",
    "avatar": null,
    "lastMessage": "",
    "timestamp": "2024-10-14T11:00:00.000Z",
    "unreadCount": 0,
    "isGroup": false,
    "isOnline": false
  }
}
```

---

## 4. Other Chat Endpoints

### Mark Chat as Read

**POST** `/api/chats/:chatId/read`

Marks all messages in a chat as read.

**Response:** `204 No Content`

### Delete Chat

**DELETE** `/api/chats/:chatId`

Soft deletes a chat for the current user.

**Response:** `204 No Content`

### Update Group Details

**PATCH** `/api/chats/:chatId`

Updates group name, description, or avatar.

**Request Body:**
```json
{
  "name": "New Group Name",
  "description": "Updated description",
  "avatar": "/uploads/avatars/new-avatar.jpg"
}
```

**Response:** `200 OK` with updated chat object

### Leave Group

**POST** `/api/chats/:chatId/leave`

Leave a group chat.

**Response:** `204 No Content`

### Get Group Members

**GET** `/api/chats/:chatId/members`

Get all members of a group.

**Response:**
```json
{
  "members": [
    {
      "userId": "user-uuid-1",
      "name": "John Doe",
      "avatar": "/uploads/avatars/john.jpg",
      "role": "ADMIN"
    }
  ]
}
```

### Add Group Members

**POST** `/api/chats/:chatId/members`

Add members to a group.

**Request Body:**
```json
{
  "memberIds": ["user-uuid-4", "user-uuid-5"]
}
```

**Response:** `204 No Content`

### Remove Group Member

**DELETE** `/api/chats/:chatId/members/:memberId`

Remove a member from a group.

**Response:** `204 No Content`

### Update Member Role

**PATCH** `/api/chats/:chatId/members/:memberId`

Promote or demote a member.

**Request Body:**
```json
{
  "role": "ADMIN"  // or "MEMBER"
}
```

**Response:** `200 OK` with updated member info

---

## 5. Message Endpoints

### Get Messages

**GET** `/api/chats/:chatId/messages`

Get messages for a chat with pagination.

**Query Parameters:**
- `limit` (number, optional): Default 50
- `cursor` (string, optional): Message ID for pagination

**Response:**
```json
{
  "messages": [...],
  "hasMore": true,
  "nextCursor": "msg-uuid-100"
}
```

### Send Message

**POST** `/api/chats/:chatId/messages`

Send a message in a chat.

**Request Body:**
```json
{
  "content": "Hello, world!",
  "attachments": [],
  "replyTo": null,
  "tempId": "temp-123"  // Optional, for optimistic updates
}
```

**Response:**
```json
{
  "message": {
    "id": "msg-uuid",
    "chatId": "chat-uuid",
    "senderId": "user-uuid",
    "senderName": "John Doe",
    "senderAvatar": "/uploads/avatars/john.jpg",
    "content": "Hello, world!",
    "timestamp": "2024-10-14T11:30:00.000Z",
    "isRead": false,
    "isSent": true,
    "attachments": [],
    "replyTo": null
  }
}
```

---

## 6. Error Responses

### 401 Unauthorized

**When:** Missing or invalid authentication token

```json
{
  "error": "UnauthorizedError",
  "message": "User authentication required"
}
```

### 403 Forbidden

**When:** User is not a member of the chat

```json
{
  "error": "UnauthorizedError",
  "message": "You are not a member of this group"
}
```

### 404 Not Found

**When:** Chat doesn't exist

```json
{
  "error": "NotFoundError",
  "message": "Chat not found"
}
```

### 400 Bad Request

**When:** Invalid request data

```json
{
  "error": "ValidationError",
  "message": "Either recipientId or groupName is required"
}
```

---

## 7. Implementation Example

### Custom Hook: `useChats`

```typescript
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface Chat {
  id: string;
  name: string;
  avatar?: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isGroup: boolean;
  isOnline?: boolean;
}

interface ChatsResponse {
  chats: Chat[];
}

const fetchChats = async (): Promise<Chat[]> => {
  const token = localStorage.getItem('accessToken');
  
  const response = await axios.get<ChatsResponse>(
    'http://localhost:3000/api/chats',
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  
  return response.data.chats;
};

export function useChats() {
  return useQuery({
    queryKey: ['chats'],
    queryFn: fetchChats,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}
```

### Usage in Component

```typescript
import { useChats } from './hooks/useChats';

function ChatList() {
  const { data: chats, isLoading, error } = useChats();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div className="chat-list">
      {chats?.map(chat => (
        <ChatItem
          key={chat.id}
          chat={chat}
          onClick={() => navigateToChat(chat.id)}
        />
      ))}
    </div>
  );
}

function ChatItem({ chat }: { chat: Chat }) {
  return (
    <div className="chat-item">
      <img
        src={chat.avatar || '/default-avatar.png'}
        alt={chat.name}
        className="avatar"
      />
      <div className="chat-info">
        <div className="chat-header">
          <h3>{chat.name}</h3>
          {chat.isGroup && <span className="badge">Group</span>}
          {!chat.isGroup && chat.isOnline && (
            <span className="online-indicator" />
          )}
        </div>
        <p className="last-message">{chat.lastMessage || 'No messages yet'}</p>
        <span className="timestamp">
          {formatTimestamp(chat.timestamp)}
        </span>
      </div>
      {chat.unreadCount > 0 && (
        <div className="unread-badge">{chat.unreadCount}</div>
      )}
    </div>
  );
}
```

---

## 8. Real-time Updates

The backend supports Socket.IO for real-time updates. When a new message is received, the chat list should be updated.

### Socket Events to Listen For

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: accessToken,
  },
});

// Listen for new messages
socket.on('message:new', (data) => {
  // Refetch chats or update the specific chat
  queryClient.invalidateQueries(['chats']);
});

// Join chat rooms
socket.emit('chat:join', { chatId });
```

---

## 9. Best Practices

### Frontend Recommendations

1. **Cache chat list** with React Query or similar
2. **Refetch periodically** (every 30-60 seconds) or use Socket.IO
3. **Optimistic updates** when sending messages
4. **Handle empty states** gracefully (no chats, no messages)
5. **Show loading states** during API calls
6. **Display unread badges** prominently
7. **Sort by timestamp** (most recent first) - backend already does this
8. **Handle avatar fallbacks** for null/undefined avatars
9. **Distinguish DMs from groups** visually using `isGroup` flag
10. **Show online status** for DMs when available

### Performance Tips

1. **Use pagination** for message history
2. **Implement virtual scrolling** for large chat lists
3. **Debounce search** if implementing chat search
4. **Cache user avatars** to reduce requests
5. **Use Socket.IO** for real-time updates instead of polling

---

## 10. Testing

### Manual Testing with cURL

```bash
# Get all chats
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/chats

# Get specific chat
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/chats/CHAT_ID

# Create DM
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"recipientId": "USER_ID"}' \
  http://localhost:3000/api/chats

# Create Group
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"groupName": "My Group", "memberIds": ["USER_ID_1", "USER_ID_2"]}' \
  http://localhost:3000/api/chats
```

---

## 11. Complete Endpoint List

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/chats` | Get all user's chats | ✅ |
| GET | `/api/chats/:chatId` | Get specific chat | ✅ |
| POST | `/api/chats` | Create new chat | ✅ |
| PATCH | `/api/chats/:chatId` | Update group details | ✅ |
| DELETE | `/api/chats/:chatId` | Delete chat | ✅ |
| POST | `/api/chats/:chatId/read` | Mark chat as read | ✅ |
| POST | `/api/chats/:chatId/leave` | Leave group | ✅ |
| GET | `/api/chats/:chatId/members` | Get group members | ✅ |
| POST | `/api/chats/:chatId/members` | Add group members | ✅ |
| DELETE | `/api/chats/:chatId/members/:memberId` | Remove member | ✅ |
| PATCH | `/api/chats/:chatId/members/:memberId` | Update member role | ✅ |
| GET | `/api/chats/:chatId/messages` | Get messages | ✅ |
| POST | `/api/chats/:chatId/messages` | Send message | ✅ |

---

## 12. Important Notes

### Response Format Confirmation

✅ **YES, the response format is:**

```typescript
{
  chats: Chat[]  // Array wrapped in "chats" property
}
```

**NOT:**
- ~~`{ data: [...] }`~~
- ~~`{ conversations: [...] }`~~
- ~~Just an array `[...]`~~

### Endpoint Confirmation

✅ **YES, the endpoint is:**

```
GET /api/chats
```

**NOT:**
- ~~`/api/conversations`~~
- ~~`/api/messages`~~
- ~~`/api/chat-list`~~

### Implementation Status

✅ **ALL endpoints are FULLY IMPLEMENTED** including:
- Get chats list
- Create chat (DM and group)
- Get chat by ID
- Send/receive messages
- Group management
- Mark as read
- Delete chat

---

## 13. Migration Guide

If you were using mock data or a different endpoint:

### Update API Client

```typescript
// OLD (if you were guessing)
const response = await axios.get('/api/conversations');
const chats = response.data.data; // ❌ Wrong

// NEW (correct)
const response = await axios.get('/api/chats', {
  headers: { Authorization: `Bearer ${token}` }
});
const chats = response.data.chats; // ✅ Correct
```

### Update TypeScript Types

```typescript
// Correct response type
interface ChatsResponse {
  chats: Chat[];  // Note: "chats" not "data" or "conversations"
}
```

---

## 14. Related Documentation

- [User Search API](./FRONTEND_USER_SEARCH_API.md)
- [Get Messages Endpoint](./FRONTEND_GET_MESSAGES_READY.md)
- [Authentication API](./api-auth.md)
- [Users API](./api-users.md)

---

## Support

For questions or issues:
- Review this documentation
- Check the backend implementation in `/src/modules/chat/`
- Contact the backend team

**Last Updated:** October 14, 2025

**Status:** ✅ Production Ready - All endpoints implemented and tested
