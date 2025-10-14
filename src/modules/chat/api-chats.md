# Chats API Documentation

Base URL: `/api/chats`

## Overview

The Chats API provides a unified interface for managing both direct messages (DMs) and group chats. It aggregates conversations, shows unread counts, and provides chat management functionality.

---

## Authentication

All endpoints require a valid JWT access token:

```
Authorization: Bearer <access_token>
```

---

## Endpoints

### 1. Get All Chats

**GET** `/api/chats`

Retrieves all chats (both DMs and groups) for the authenticated user.

**Authentication:** Required

#### Response

**Status:** `200 OK`

```json
{
  "chats": [
    {
      "id": "string",
      "name": "string",
      "avatar": "string",
      "lastMessage": "string",
      "timestamp": "string",
      "unreadCount": 0,
      "isGroup": false,
      "isOnline": true
    }
  ]
}
```

#### Example Request

```javascript
// Using fetch
const accessToken = localStorage.getItem('accessToken');

const response = await fetch('http://localhost:3000/api/chats', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const { chats } = await response.json();
console.log(`You have ${chats.length} chats`);
```

```javascript
// Using axios with React
import axios from 'axios';
import { useState, useEffect } from 'react';

function ChatList() {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const { data } = await axios.get('http://localhost:3000/api/chats', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        setChats(data.chats);
      } catch (error) {
        console.error('Failed to fetch chats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchChats();
  }, []);
  
  if (loading) return <div>Loading chats...</div>;
  
  return (
    <div>
      {chats.map(chat => (
        <div key={chat.id}>
          <img src={chat.avatar || '/default-avatar.png'} alt={chat.name} />
          <div>
            <h3>{chat.name}</h3>
            <p>{chat.lastMessage}</p>
            {chat.unreadCount > 0 && <span>{chat.unreadCount} unread</span>}
          </div>
          {!chat.isGroup && chat.isOnline && <span>🟢 Online</span>}
        </div>
      ))}
    </div>
  );
}
```

#### Notes
- Chats are sorted by most recent activity (timestamp descending)
- Includes both direct messages and group chats
- `isOnline` is only present for direct messages
- Unread count is calculated from message receipts

---

### 2. Get Chat by ID

**GET** `/api/chats/:chatId`

Retrieves details of a specific chat.

**Authentication:** Required (must be a member)

#### URL Parameters

- `chatId` (string, required): Chat ID (UUID)

#### Response

**Status:** `200 OK`

```json
{
  "id": "string",
  "name": "string",
  "avatar": "string",
  "lastMessage": "string",
  "timestamp": "string",
  "unreadCount": 0,
  "isGroup": false,
  "isOnline": true
}
```

#### Example Request

```javascript
// Using fetch
const chatId = 'chat-uuid-123';
const accessToken = localStorage.getItem('accessToken');

const response = await fetch(`http://localhost:3000/api/chats/${chatId}`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const chat = await response.json();
console.log(chat);
```

#### Error Responses

**Status:** `400 Bad Request`
```json
{
  "error": "ValidationError",
  "message": "Chat ID is required"
}
```

**Status:** `401 Unauthorized`
```json
{
  "error": "UnauthorizedError",
  "message": "You are not a member of this group"
}
```

**Status:** `404 Not Found`
```json
{
  "error": "NotFoundError",
  "message": "Chat not found"
}
```

---

### 3. Create Chat

**POST** `/api/chats`

Creates a new chat (either a direct message or group chat).

**Authentication:** Required

#### Request Body

For **Direct Message**:
```json
{
  "recipientId": "string"
}
```

For **Group Chat**:
```json
{
  "groupName": "string",
  "memberIds": ["string"]  // Optional: additional members
}
```

**Note:** Must specify either `recipientId` OR `groupName`, not both.

#### Response

**Status:** `201 Created`

```json
{
  "chat": {
    "id": "string",
    "name": "string",
    "avatar": "string",
    "lastMessage": "",
    "timestamp": "string",
    "unreadCount": 0,
    "isGroup": false,
    "isOnline": false
  }
}
```

#### Example Request

```javascript
// Create DM
const accessToken = localStorage.getItem('accessToken');

const response = await fetch('http://localhost:3000/api/chats', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    recipientId: 'user-uuid-456'
  })
});

const { chat } = await response.json();
console.log('DM created:', chat.id);
```

```javascript
// Create Group
const response = await fetch('http://localhost:3000/api/chats', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    groupName: 'Project Team',
    memberIds: ['user-1', 'user-2', 'user-3']
  })
});

const { chat } = await response.json();
console.log('Group created:', chat.id);
```

```javascript
// Using axios - Create or get existing DM
import axios from 'axios';

async function createOrGetDM(recipientId) {
  try {
    const token = localStorage.getItem('accessToken');
    const { data } = await axios.post(
      'http://localhost:3000/api/chats',
      { recipientId },
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    // Returns existing conversation if it already exists
    return data.chat;
  } catch (error) {
    console.error('Failed to create chat:', error);
    throw error;
  }
}
```

#### Error Responses

**Status:** `400 Bad Request`
```json
{
  "error": "ValidationError",
  "message": "Either recipientId or groupName is required"
}
```

```json
{
  "error": "ValidationError",
  "message": "Cannot specify both recipientId and groupName"
}
```

**Status:** `404 Not Found`
```json
{
  "error": "NotFoundError",
  "message": "Recipient user not found"
}
```

#### Notes
- For DMs: Returns existing conversation if one already exists
- For groups: Creator automatically becomes admin
- Additional members are added with MEMBER role

---

### 4. Mark Chat as Read

**POST** `/api/chats/:chatId/read`

Marks all unread messages in a chat as read.

**Authentication:** Required (must be a member)

#### URL Parameters

- `chatId` (string, required): Chat ID (UUID)

#### Response

**Status:** `204 No Content`

No response body.

#### Example Request

```javascript
// Using fetch
const chatId = 'chat-uuid-123';
const accessToken = localStorage.getItem('accessToken');

await fetch(`http://localhost:3000/api/chats/${chatId}/read`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

console.log('Chat marked as read');
```

```javascript
// Using axios - Mark as read when opening chat
import axios from 'axios';
import { useEffect } from 'react';

function ChatView({ chatId }) {
  useEffect(() => {
    const markAsRead = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        await axios.post(
          `http://localhost:3000/api/chats/${chatId}/read`,
          {},
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    };
    
    markAsRead();
  }, [chatId]);
  
  return <div>Chat content...</div>;
}
```

#### Error Responses

**Status:** `401 Unauthorized`
```json
{
  "error": "UnauthorizedError",
  "message": "You are not a member of this group"
}
```

**Status:** `404 Not Found`
```json
{
  "error": "NotFoundError",
  "message": "Chat not found"
}
```

---

### 5. Delete Chat

**DELETE** `/api/chats/:chatId`

Deletes or hides a chat for the current user.

**Authentication:** Required

#### URL Parameters

- `chatId` (string, required): Chat ID (UUID)

#### Response

**Status:** `204 No Content`

No response body.

#### Example Request

```javascript
// Using fetch
const chatId = 'chat-uuid-123';
const accessToken = localStorage.getItem('accessToken');

await fetch(`http://localhost:3000/api/chats/${chatId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

console.log('Chat deleted');
```

```javascript
// Using axios with confirmation
import axios from 'axios';

async function deleteChat(chatId) {
  if (!confirm('Delete this chat?')) return;
  
  try {
    const token = localStorage.getItem('accessToken');
    await axios.delete(`http://localhost:3000/api/chats/${chatId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('Chat deleted successfully');
    // Refresh chat list or navigate away
  } catch (error) {
    console.error('Failed to delete chat:', error);
  }
}
```

#### Notes
- For DMs: Soft delete (hides for user)
- For groups: Deletes the group (admin only)

---

### 6. Leave Group

**POST** `/api/chats/:chatId/leave`

Leave a group chat.

**Authentication:** Required (must be a member)

#### URL Parameters

- `chatId` (string, required): Group chat ID (UUID)

#### Response

**Status:** `204 No Content`

No response body.

#### Example Request

```javascript
// Using fetch
const groupId = 'group-uuid-123';
const accessToken = localStorage.getItem('accessToken');

await fetch(`http://localhost:3000/api/chats/${groupId}/leave`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

console.log('Left group');
```

```javascript
// Using axios
import axios from 'axios';

async function leaveGroup(groupId) {
  if (!confirm('Leave this group?')) return;
  
  try {
    const token = localStorage.getItem('accessToken');
    await axios.post(
      `http://localhost:3000/api/chats/${groupId}/leave`,
      {},
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    alert('You have left the group');
    // Redirect to chat list
  } catch (error) {
    console.error('Failed to leave group:', error);
  }
}
```

#### Error Responses

**Status:** `400 Bad Request`
```json
{
  "error": "ValidationError",
  "message": "You are not a member of this group"
}
```

**Status:** `404 Not Found`
```json
{
  "error": "NotFoundError",
  "message": "Group not found"
}
```

#### Notes
- Only works for group chats
- Removes user from group members
- Cannot leave if you're the only admin (implement this check if needed)

---

### 7. Add Group Members

**POST** `/api/chats/:chatId/members`

Add members to a group chat.

**Authentication:** Required (must be admin)

#### URL Parameters

- `chatId` (string, required): Group chat ID (UUID)

#### Request Body

```json
{
  "memberIds": ["string"]  // Array of user IDs to add
}
```

#### Response

**Status:** `204 No Content`

No response body.

#### Example Request

```javascript
// Using fetch
const groupId = 'group-uuid-123';
const accessToken = localStorage.getItem('accessToken');

await fetch(`http://localhost:3000/api/chats/${groupId}/members`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    memberIds: ['user-1', 'user-2', 'user-3']
  })
});

console.log('Members added');
```

```javascript
// Using axios
import axios from 'axios';

async function addMembersToGroup(groupId, userIds) {
  try {
    const token = localStorage.getItem('accessToken');
    await axios.post(
      `http://localhost:3000/api/chats/${groupId}/members`,
      { memberIds: userIds },
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    console.log(`Added ${userIds.length} members to group`);
  } catch (error) {
    console.error('Failed to add members:', error);
  }
}
```

#### Error Responses

**Status:** `400 Bad Request`
```json
{
  "error": "ValidationError",
  "message": "memberIds array is required and must not be empty"
}
```

**Status:** `401 Unauthorized`
```json
{
  "error": "UnauthorizedError",
  "message": "Only admins can add members"
}
```

**Status:** `404 Not Found`
```json
{
  "error": "NotFoundError",
  "message": "Group not found"
}
```

#### Notes
- Only group admins can add members
- New members are added with MEMBER role
- Fails silently for individual members if they're already in the group

---

### 8. Remove Group Member

**DELETE** `/api/chats/:chatId/members/:memberId`

Remove a member from a group chat.

**Authentication:** Required (must be admin)

#### URL Parameters

- `chatId` (string, required): Group chat ID (UUID)
- `memberId` (string, required): User ID to remove (UUID)

#### Response

**Status:** `204 No Content`

No response body.

#### Example Request

```javascript
// Using fetch
const groupId = 'group-uuid-123';
const memberId = 'user-uuid-456';
const accessToken = localStorage.getItem('accessToken');

await fetch(`http://localhost:3000/api/chats/${groupId}/members/${memberId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

console.log('Member removed');
```

```javascript
// Using axios with confirmation
import axios from 'axios';

async function removeMember(groupId, memberId, memberName) {
  if (!confirm(`Remove ${memberName} from the group?`)) return;
  
  try {
    const token = localStorage.getItem('accessToken');
    await axios.delete(
      `http://localhost:3000/api/chats/${groupId}/members/${memberId}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    console.log('Member removed successfully');
  } catch (error) {
    console.error('Failed to remove member:', error);
  }
}
```

#### Error Responses

**Status:** `400 Bad Request`
```json
{
  "error": "ValidationError",
  "message": "Member ID is required"
}
```

**Status:** `401 Unauthorized`
```json
{
  "error": "UnauthorizedError",
  "message": "Only admins can remove members"
}
```

**Status:** `404 Not Found`
```json
{
  "error": "NotFoundError",
  "message": "Group not found"
}
```

---

## Data Models

### Chat Response Object

```typescript
interface ChatResponse {
  id: string;              // Chat ID (conversation or group ID)
  name: string;            // Chat name (user name for DM, group name for group)
  avatar?: string;         // Avatar URL
  lastMessage: string;     // Most recent message content
  timestamp: string;       // ISO 8601 timestamp of last activity
  unreadCount: number;     // Number of unread messages
  isGroup: boolean;        // true for groups, false for DMs
  isOnline?: boolean;      // Online status (DMs only)
}
```

### Create Chat Request

```typescript
interface CreateChatRequest {
  recipientId?: string;    // For DM: recipient user ID
  groupName?: string;      // For group: group name
  memberIds?: string[];    // For group: additional member IDs
}
```

---

## Complete Usage Example

### Chat Management Component (React)

```javascript
import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:3000';

function ChatManager() {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchChats();
  }, []);
  
  const fetchChats = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const { data } = await axios.get(`${API_BASE}/api/chats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setChats(data.chats);
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const createDM = async (recipientId) => {
    try {
      const token = localStorage.getItem('accessToken');
      const { data } = await axios.post(
        `${API_BASE}/api/chats`,
        { recipientId },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      setChats([data.chat, ...chats]);
      setSelectedChat(data.chat);
    } catch (error) {
      console.error('Failed to create DM:', error);
    }
  };
  
  const createGroup = async (groupName, memberIds) => {
    try {
      const token = localStorage.getItem('accessToken');
      const { data } = await axios.post(
        `${API_BASE}/api/chats`,
        { groupName, memberIds },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      setChats([data.chat, ...chats]);
      setSelectedChat(data.chat);
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  };
  
  const markAsRead = async (chatId) => {
    try {
      const token = localStorage.getItem('accessToken');
      await axios.post(
        `${API_BASE}/api/chats/${chatId}/read`,
        {},
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      // Update local state
      setChats(chats.map(chat => 
        chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
      ));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };
  
  const deleteChat = async (chatId) => {
    if (!confirm('Delete this chat?')) return;
    
    try {
      const token = localStorage.getItem('accessToken');
      await axios.delete(`${API_BASE}/api/chats/${chatId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setChats(chats.filter(chat => chat.id !== chatId));
      if (selectedChat?.id === chatId) {
        setSelectedChat(null);
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };
  
  const leaveGroup = async (chatId) => {
    if (!confirm('Leave this group?')) return;
    
    try {
      const token = localStorage.getItem('accessToken');
      await axios.post(
        `${API_BASE}/api/chats/${chatId}/leave`,
        {},
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      setChats(chats.filter(chat => chat.id !== chatId));
      if (selectedChat?.id === chatId) {
        setSelectedChat(null);
      }
    } catch (error) {
      console.error('Failed to leave group:', error);
    }
  };
  
  if (loading) return <div>Loading chats...</div>;
  
  return (
    <div style={{ display: 'flex' }}>
      {/* Chat List */}
      <div style={{ width: '300px', borderRight: '1px solid #ccc' }}>
        <h2>Chats</h2>
        <button onClick={() => createGroup('New Group', [])}>
          Create Group
        </button>
        
        {chats.map(chat => (
          <div
            key={chat.id}
            onClick={() => {
              setSelectedChat(chat);
              markAsRead(chat.id);
            }}
            style={{
              padding: '10px',
              cursor: 'pointer',
              background: selectedChat?.id === chat.id ? '#f0f0f0' : 'white'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <img
                src={chat.avatar || '/default-avatar.png'}
                alt={chat.name}
                style={{ width: 40, height: 40, borderRadius: '50%' }}
              />
              <div style={{ marginLeft: 10, flex: 1 }}>
                <div style={{ fontWeight: 'bold' }}>
                  {chat.name}
                  {!chat.isGroup && chat.isOnline && ' 🟢'}
                </div>
                <div style={{ fontSize: '0.9em', color: '#666' }}>
                  {chat.lastMessage}
                </div>
              </div>
              {chat.unreadCount > 0 && (
                <span style={{
                  background: '#007bff',
                  color: 'white',
                  borderRadius: '50%',
                  padding: '2px 8px',
                  fontSize: '0.8em'
                }}>
                  {chat.unreadCount}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Chat View */}
      <div style={{ flex: 1, padding: 20 }}>
        {selectedChat ? (
          <div>
            <h2>{selectedChat.name}</h2>
            <div>
              <button onClick={() => deleteChat(selectedChat.id)}>
                Delete Chat
              </button>
              {selectedChat.isGroup && (
                <button onClick={() => leaveGroup(selectedChat.id)}>
                  Leave Group
                </button>
              )}
            </div>
            {/* Messages would go here */}
          </div>
        ) : (
          <div>Select a chat to view messages</div>
        )}
      </div>
    </div>
  );
}
```

---

## Common Error Codes

| Status Code | Error Type | Description |
|-------------|------------|-------------|
| 400 | ValidationError | Invalid request data |
| 401 | UnauthorizedError | Missing/invalid auth or insufficient permissions |
| 404 | NotFoundError | Chat or user not found |
| 500 | InternalServerError | Server error |

---

## Integration with Socket.IO

For real-time updates, combine this API with Socket.IO events:

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: localStorage.getItem('accessToken')
  }
});

// Listen for new messages
socket.on('message:new', ({ message }) => {
  // Update chat list with new message
  updateChatLastMessage(message.conversationId || message.groupId, message);
});

// Listen for message read confirmations
socket.on('message:read:confirmed', ({ messageId, readerId }) => {
  // Update UI to show message was read
});

// Listen for presence updates
socket.on('presence:update', ({ userId, status }) => {
  // Update online status for DMs
  updateUserOnlineStatus(userId, status === 'online');
});
```

---

## Support

For issues or questions, please contact the backend team or refer to the main API documentation.
