# Chats API - Quick Reference

## ✅ Endpoint Exists!

**YES, `/api/chats` is implemented and working!**

---

## TL;DR

```typescript
// Endpoint
GET /api/chats

// Response format (CONFIRMED)
{
  chats: Array<{
    id: string;
    name: string;
    avatar?: string;
    lastMessage: string;
    timestamp: string;
    unreadCount: number;
    isGroup: boolean;
    isOnline?: boolean;
  }>
}
```

---

## Quick Answers

| Question | Answer |
|----------|--------|
| **Endpoint** | ✅ `GET /api/chats` (EXISTS!) |
| **Alternative names?** | ❌ No, it's `/api/chats` not `/api/conversations` |
| **Response format** | `{ chats: [...] }` NOT `{ data: [...] }` |
| **Authentication** | ✅ Required - Bearer token |
| **Implementation status** | ✅ Fully implemented and production-ready |
| **Includes DMs?** | ✅ Yes |
| **Includes groups?** | ✅ Yes |
| **Sorted?** | ✅ Yes, by timestamp (most recent first) |

---

## Response Structure (CONFIRMED)

```typescript
interface ChatsResponse {
  chats: Chat[];  // ⚠️ Property name is "chats" not "data"
}

interface Chat {
  id: string;              // Chat ID
  name: string;            // User name (DM) or group name
  avatar?: string;         // Optional avatar URL
  lastMessage: string;     // Last message content (empty string if none)
  timestamp: string;       // ISO 8601 timestamp
  unreadCount: number;     // Number of unread messages
  isGroup: boolean;        // true = group, false = DM
  isOnline?: boolean;      // Optional, only for DMs (currently always false)
}
```

---

## Copy-Paste Hook

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

const fetchChats = async (): Promise<Chat[]> => {
  const token = localStorage.getItem('accessToken');
  
  const response = await axios.get<{ chats: Chat[] }>(
    '/api/chats',
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  
  return response.data.chats;  // ⚠️ Note: .chats not .data
};

export function useChats() {
  return useQuery({
    queryKey: ['chats'],
    queryFn: fetchChats,
    staleTime: 30000,
  });
}
```

---

## All Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chats` | Get all chats |
| GET | `/api/chats/:chatId` | Get specific chat |
| POST | `/api/chats` | Create chat (DM or group) |
| POST | `/api/chats/:chatId/read` | Mark as read |
| DELETE | `/api/chats/:chatId` | Delete chat |
| PATCH | `/api/chats/:chatId` | Update group details |
| POST | `/api/chats/:chatId/leave` | Leave group |
| GET | `/api/chats/:chatId/members` | Get group members |
| POST | `/api/chats/:chatId/members` | Add members |
| DELETE | `/api/chats/:chatId/members/:id` | Remove member |
| PATCH | `/api/chats/:chatId/members/:id` | Update role |
| GET | `/api/chats/:chatId/messages` | Get messages |
| POST | `/api/chats/:chatId/messages` | Send message |

---

## Create Chat Examples

### Create DM

```typescript
const createDM = async (recipientId: string) => {
  const response = await axios.post(
    '/api/chats',
    { recipientId },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data.chat;
};
```

### Create Group

```typescript
const createGroup = async (groupName: string, memberIds: string[]) => {
  const response = await axios.post(
    '/api/chats',
    { groupName, memberIds },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data.chat;
};
```

---

## Error Responses

```typescript
// 401 - No auth token
{
  "error": "UnauthorizedError",
  "message": "User authentication required"
}

// 403 - Not a member
{
  "error": "UnauthorizedError",
  "message": "You are not a member of this group"
}

// 404 - Chat not found
{
  "error": "NotFoundError",
  "message": "Chat not found"
}
```

---

## Important Notes

1. ✅ **Endpoint EXISTS** - `/api/chats` is implemented
2. ✅ **Response format** - `{ chats: [...] }` NOT `{ data: [...] }`
3. ✅ **Authentication required** - Must send Bearer token
4. ✅ **Both DMs and groups** - Returned in single array
5. ✅ **Already sorted** - By timestamp, most recent first
6. ⚠️ **Avatar is optional** - Can be `undefined` or omitted
7. ⚠️ **isOnline is optional** - Only for DMs, currently always `false`
8. ⚠️ **Empty lastMessage** - Empty string `""` if no messages yet

---

## Fix Your Code

### ❌ Wrong

```typescript
// Wrong endpoint
const response = await axios.get('/api/conversations');

// Wrong property access
const chats = response.data.data;

// Missing auth
const response = await axios.get('/api/chats');
```

### ✅ Correct

```typescript
// Correct endpoint
const response = await axios.get('/api/chats', {
  headers: { Authorization: `Bearer ${token}` }
});

// Correct property access
const chats = response.data.chats;
```

---

## Full Documentation

See [FRONTEND_CHATS_API.md](./FRONTEND_CHATS_API.md) for complete details.

---

**Status:** ✅ All endpoints implemented and production-ready!
