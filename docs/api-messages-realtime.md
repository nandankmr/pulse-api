# Messages & Realtime API Documentation

Base URL: `ws://localhost:3000` (Socket.IO)

## Overview

The Messages API uses Socket.IO for real-time bidirectional communication. It handles sending messages, read receipts, typing indicators, and presence updates.

---

## Connection

### Establishing Connection

Connect to the Socket.IO server with authentication:

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: localStorage.getItem('accessToken')  // JWT access token
  }
});

// Alternative: Pass token in query string
const socket = io('http://localhost:3000', {
  query: {
    token: localStorage.getItem('accessToken')
  }
});

// Alternative: Pass in Authorization header
const socket = io('http://localhost:3000', {
  extraHeaders: {
    Authorization: `Bearer ${localStorage.getItem('accessToken')}`
  }
});
```

### Connection Events

```javascript
socket.on('connect', () => {
  console.log('Connected to server:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
  // Usually means authentication failed
});
```

---

## Client to Server Events

### 1. Send Message

**Event:** `message:send`

Sends a new message to a user or group.

#### Payload

```typescript
{
  receiverId?: string;        // For DM (UUID)
  groupId?: string;           // For group message (UUID)
  conversationId?: string;    // Optional: existing conversation ID
  type?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' | 'LOCATION';
  content?: string;           // Message text content
  mediaUrl?: string;          // URL to media file
  location?: {                // Location data
    latitude: number;
    longitude: number;
  };
  tempId?: string;            // Optional: client-generated temp ID for optimistic UI
}
```

**Note:** Must specify either `receiverId` OR `groupId`. At least one of `content`, `mediaUrl`, or `location` is required.

#### Acknowledgment

```typescript
{
  status: 'ok' | 'error';
  error?: string;             // Error message if status is 'error'
  message?: Message;          // Created message object
  conversationId?: string;    // Conversation ID (for DMs)
  tempId?: string;            // Echo back tempId if provided
}
```

#### Example

```javascript
// Send text message to user
socket.emit('message:send', {
  receiverId: 'user-uuid-123',
  type: 'TEXT',
  content: 'Hello, how are you?',
  tempId: 'temp-msg-001'
}, (ack) => {
  if (ack.status === 'ok') {
    console.log('Message sent:', ack.message.id);
    // Replace temp message with real message
    replaceMessage(ack.tempId, ack.message);
  } else {
    console.error('Failed to send:', ack.error);
  }
});

// Send message to group
socket.emit('message:send', {
  groupId: 'group-uuid-456',
  type: 'TEXT',
  content: 'Hello everyone!',
  tempId: 'temp-msg-002'
}, (ack) => {
  if (ack.status === 'ok') {
    console.log('Group message sent');
  }
});

// Send image message
socket.emit('message:send', {
  receiverId: 'user-uuid-123',
  type: 'IMAGE',
  mediaUrl: 'https://example.com/image.jpg',
  content: 'Check out this photo!'
}, (ack) => {
  console.log('Image sent:', ack);
});

// Send location
socket.emit('message:send', {
  receiverId: 'user-uuid-123',
  type: 'LOCATION',
  location: {
    latitude: 37.7749,
    longitude: -122.4194
  },
  content: 'I am here'
}, (ack) => {
  console.log('Location sent');
});
```

---

### 2. Mark Message as Read

**Event:** `message:read`

Marks a message as read by the current user.

#### Payload

```typescript
{
  messageId: string;          // Required: Message ID to mark as read
  targetUserId?: string;      // For DM: the other user's ID
  groupId?: string;           // For group: the group ID
  conversationId?: string;    // Optional: conversation ID
  readAt?: string;            // Optional: ISO timestamp (defaults to now)
}
```

#### Example

```javascript
// Mark DM message as read
socket.emit('message:read', {
  messageId: 'msg-uuid-789',
  targetUserId: 'user-uuid-123',
  conversationId: 'conv-uuid-456'
});

// Mark group message as read
socket.emit('message:read', {
  messageId: 'msg-uuid-790',
  groupId: 'group-uuid-456'
});
```

---

### 3. Typing Indicator - Start

**Event:** `typing:start`

Notifies others that the user is typing.

#### Payload

```typescript
{
  conversationId?: string;    // For DM
  targetUserId?: string;      // For DM: recipient user ID
  groupId?: string;           // For group
}
```

#### Example

```javascript
// Start typing in DM
socket.emit('typing:start', {
  targetUserId: 'user-uuid-123',
  conversationId: 'conv-uuid-456'
});

// Start typing in group
socket.emit('typing:start', {
  groupId: 'group-uuid-456'
});
```

---

### 4. Typing Indicator - Stop

**Event:** `typing:stop`

Notifies others that the user stopped typing.

#### Payload

```typescript
{
  conversationId?: string;    // For DM
  targetUserId?: string;      // For DM: recipient user ID
  groupId?: string;           // For group
}
```

#### Example

```javascript
// Stop typing in DM
socket.emit('typing:stop', {
  targetUserId: 'user-uuid-123',
  conversationId: 'conv-uuid-456'
});

// Stop typing in group
socket.emit('typing:stop', {
  groupId: 'group-uuid-456'
});
```

---

### 5. Join Group Room

**Event:** `group:join`

Subscribes to real-time updates for a specific group.

#### Payload

```typescript
{
  groupId: string;            // Group ID to join
}
```

#### Example

```javascript
// Join group room to receive messages
socket.emit('group:join', {
  groupId: 'group-uuid-456'
});
```

**Note:** Call this when opening a group chat to receive real-time messages.

---

### 6. Leave Group Room

**Event:** `group:leave`

Unsubscribes from real-time updates for a specific group.

#### Payload

```typescript
{
  groupId: string;            // Group ID to leave
}
```

#### Example

```javascript
// Leave group room when closing chat
socket.emit('group:leave', {
  groupId: 'group-uuid-456'
});
```

---

### 7. Subscribe to Presence

**Event:** `presence:subscribe`

Requests current online user list.

#### Payload

No payload required.

#### Example

```javascript
// Get current online users
socket.emit('presence:subscribe');

// Listen for response
socket.on('presence:state', ({ onlineUserIds }) => {
  console.log('Online users:', onlineUserIds);
});
```

---

## Server to Client Events

### 1. New Message

**Event:** `message:new`

Received when a new message is sent (to you or in a group you're in).

#### Payload

```typescript
{
  message: Message;           // The message object
  tempId?: string;            // Client's temp ID if provided
}
```

#### Message Object

```typescript
interface Message {
  id: string;
  senderId: string;
  receiverId?: string;
  groupId?: string;
  conversationId?: string;
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' | 'LOCATION';
  content?: string;
  mediaUrl?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}
```

#### Example

```javascript
socket.on('message:new', ({ message, tempId }) => {
  console.log('New message received:', message);
  
  if (tempId) {
    // Replace optimistic message with real one
    replaceOptimisticMessage(tempId, message);
  } else {
    // Add new message to chat
    addMessageToChat(message);
  }
  
  // Show notification if chat is not active
  if (!isChatActive(message.conversationId || message.groupId)) {
    showNotification(message);
  }
});
```

---

### 2. Message Delivered

**Event:** `message:delivered`

Received when your message is delivered to recipients.

#### Payload

```typescript
{
  messageId: string;          // Message ID
  participantIds: string[];   // User IDs who received it
}
```

#### Example

```javascript
socket.on('message:delivered', ({ messageId, participantIds }) => {
  console.log(`Message ${messageId} delivered to ${participantIds.length} users`);
  
  // Update message status to delivered
  updateMessageStatus(messageId, 'delivered');
});
```

---

### 3. Message Read

**Event:** `message:read`

Received when someone reads a message.

#### Payload

```typescript
{
  messageId: string;
  readerId: string;           // User who read the message
  readAt: string;             // ISO timestamp
  targetUserId?: string;
  groupId?: string;
  conversationId?: string;
}
```

#### Example

```javascript
socket.on('message:read', ({ messageId, readerId, readAt }) => {
  console.log(`Message ${messageId} read by ${readerId} at ${readAt}`);
  
  // Update UI to show message was read
  updateMessageReadStatus(messageId, readerId, readAt);
});
```

---

### 4. Message Read Confirmed

**Event:** `message:read:confirmed`

Confirmation that your read receipt was processed.

#### Payload

```typescript
{
  messageId: string;
  readerId: string;           // Your user ID
  readAt: string;
}
```

#### Example

```javascript
socket.on('message:read:confirmed', ({ messageId, readerId, readAt }) => {
  console.log('Read receipt confirmed:', messageId);
});
```

---

### 5. Typing Start

**Event:** `typing:start`

Received when someone starts typing.

#### Payload

```typescript
{
  userId: string;             // User who is typing
  conversationId?: string;
  targetUserId?: string;
  groupId?: string;
}
```

#### Example

```javascript
socket.on('typing:start', ({ userId, conversationId, groupId }) => {
  console.log(`User ${userId} is typing`);
  
  if (conversationId) {
    showTypingIndicator(conversationId, userId);
  } else if (groupId) {
    showGroupTypingIndicator(groupId, userId);
  }
});
```

---

### 6. Typing Stop

**Event:** `typing:stop`

Received when someone stops typing.

#### Payload

```typescript
{
  userId: string;             // User who stopped typing
  conversationId?: string;
  targetUserId?: string;
  groupId?: string;
}
```

#### Example

```javascript
socket.on('typing:stop', ({ userId, conversationId, groupId }) => {
  console.log(`User ${userId} stopped typing`);
  
  if (conversationId) {
    hideTypingIndicator(conversationId, userId);
  } else if (groupId) {
    hideGroupTypingIndicator(groupId, userId);
  }
});
```

---

### 7. Presence Update

**Event:** `presence:update`

Received when a user's online status changes.

#### Payload

```typescript
{
  userId: string;
  status: 'online' | 'offline';
}
```

#### Example

```javascript
socket.on('presence:update', ({ userId, status }) => {
  console.log(`User ${userId} is now ${status}`);
  
  // Update UI to show online/offline status
  updateUserPresence(userId, status);
});
```

---

### 8. Presence State

**Event:** `presence:state`

Received with the current list of online users.

#### Payload

```typescript
{
  onlineUserIds: string[];    // Array of online user IDs
}
```

#### Example

```javascript
socket.on('presence:state', ({ onlineUserIds }) => {
  console.log('Currently online:', onlineUserIds);
  
  // Update UI to show who's online
  setOnlineUsers(onlineUserIds);
});
```

---

## Complete Usage Example

### React Chat Component with Socket.IO

```javascript
import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

function ChatComponent({ chatId, isGroup, currentUserId }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    // Connect to Socket.IO
    const socket = io('http://localhost:3000', {
      auth: {
        token: localStorage.getItem('accessToken')
      }
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('Connected to chat server');
      
      // Join group room if it's a group chat
      if (isGroup) {
        socket.emit('group:join', { groupId: chatId });
      }
      
      // Subscribe to presence
      socket.emit('presence:subscribe');
    });

    // Listen for new messages
    socket.on('message:new', ({ message, tempId }) => {
      setMessages(prev => {
        // Replace temp message or add new
        if (tempId) {
          return prev.map(m => m.tempId === tempId ? message : m);
        }
        return [...prev, message];
      });
    });

    // Listen for message delivered
    socket.on('message:delivered', ({ messageId }) => {
      setMessages(prev =>
        prev.map(m => m.id === messageId ? { ...m, status: 'delivered' } : m)
      );
    });

    // Listen for message read
    socket.on('message:read', ({ messageId, readerId }) => {
      setMessages(prev =>
        prev.map(m => {
          if (m.id === messageId) {
            return {
              ...m,
              readBy: [...(m.readBy || []), readerId]
            };
          }
          return m;
        })
      );
    });

    // Listen for typing indicators
    socket.on('typing:start', ({ userId }) => {
      if (userId !== currentUserId) {
        setTypingUsers(prev => new Set([...prev, userId]));
      }
    });

    socket.on('typing:stop', ({ userId }) => {
      setTypingUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    // Listen for presence updates
    socket.on('presence:update', ({ userId, status }) => {
      setOnlineUsers(prev => {
        if (status === 'online') {
          return [...prev, userId];
        }
        return prev.filter(id => id !== userId);
      });
    });

    socket.on('presence:state', ({ onlineUserIds }) => {
      setOnlineUsers(onlineUserIds);
    });

    // Cleanup
    return () => {
      if (isGroup) {
        socket.emit('group:leave', { groupId: chatId });
      }
      socket.disconnect();
    };
  }, [chatId, isGroup, currentUserId]);

  const sendMessage = () => {
    if (!inputValue.trim()) return;

    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      tempId,
      content: inputValue,
      senderId: currentUserId,
      createdAt: new Date().toISOString(),
      status: 'sending'
    };

    // Optimistic update
    setMessages(prev => [...prev, tempMessage]);
    setInputValue('');

    // Send via socket
    const payload = {
      content: inputValue,
      type: 'TEXT',
      tempId
    };

    if (isGroup) {
      payload.groupId = chatId;
    } else {
      payload.receiverId = chatId;
    }

    socketRef.current.emit('message:send', payload, (ack) => {
      if (ack.status === 'error') {
        console.error('Failed to send:', ack.error);
        // Mark message as failed
        setMessages(prev =>
          prev.map(m => m.tempId === tempId ? { ...m, status: 'failed' } : m)
        );
      }
    });

    // Stop typing
    handleStopTyping();
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    handleStartTyping();
  };

  const handleStartTyping = () => {
    const payload = isGroup
      ? { groupId: chatId }
      : { targetUserId: chatId };

    socketRef.current.emit('typing:start', payload);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Auto-stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 3000);
  };

  const handleStopTyping = () => {
    const payload = isGroup
      ? { groupId: chatId }
      : { targetUserId: chatId };

    socketRef.current.emit('typing:stop', payload);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const markAsRead = (messageId) => {
    const payload = {
      messageId,
      ...(isGroup ? { groupId: chatId } : { targetUserId: chatId })
    };

    socketRef.current.emit('message:read', payload);
  };

  return (
    <div>
      <div className="messages">
        {messages.map(msg => (
          <div key={msg.id || msg.tempId}>
            <span>{msg.content}</span>
            {msg.status === 'sending' && <span>⏳</span>}
            {msg.status === 'delivered' && <span>✓</span>}
            {msg.readBy?.length > 0 && <span>✓✓</span>}
          </div>
        ))}
        
        {typingUsers.size > 0 && (
          <div className="typing-indicator">
            {typingUsers.size} user(s) typing...
          </div>
        )}
      </div>

      <div className="input-area">
        <input
          value={inputValue}
          onChange={handleInputChange}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}
```

---

## Message Types

```typescript
enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  FILE = 'FILE',
  LOCATION = 'LOCATION'
}
```

---

## Best Practices

### 1. Optimistic UI Updates

```javascript
// Add message immediately with temp ID
const tempMessage = {
  tempId: `temp-${Date.now()}`,
  content: messageText,
  status: 'sending'
};
addMessage(tempMessage);

// Send to server
socket.emit('message:send', { content: messageText, tempId: tempMessage.tempId }, (ack) => {
  if (ack.status === 'ok') {
    // Replace temp message with real one
    replaceMessage(tempMessage.tempId, ack.message);
  } else {
    // Mark as failed
    markMessageFailed(tempMessage.tempId);
  }
});
```

### 2. Typing Indicators

```javascript
let typingTimeout;

function handleTyping() {
  socket.emit('typing:start', { targetUserId });
  
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('typing:stop', { targetUserId });
  }, 3000);
}
```

### 3. Read Receipts

```javascript
// Mark as read when message enters viewport
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const messageId = entry.target.dataset.messageId;
      socket.emit('message:read', { messageId, targetUserId });
    }
  });
});
```

### 4. Reconnection Handling

```javascript
socket.on('disconnect', () => {
  console.log('Disconnected, will reconnect...');
});

socket.on('connect', () => {
  console.log('Reconnected!');
  // Re-join rooms
  if (currentGroupId) {
    socket.emit('group:join', { groupId: currentGroupId });
  }
});
```

---

## Error Handling

```javascript
socket.on('connect_error', (error) => {
  if (error.message === 'Authentication token missing') {
    // Redirect to login
    window.location.href = '/login';
  } else if (error.message === 'Invalid or expired authentication token') {
    // Try to refresh token
    refreshAuthToken().then(newToken => {
      socket.auth.token = newToken;
      socket.connect();
    });
  }
});

socket.emit('message:send', payload, (ack) => {
  if (ack.status === 'error') {
    switch (ack.error) {
      case 'receiverId or groupId is required':
        console.error('Invalid recipient');
        break;
      case 'Failed to send message':
        console.error('Server error, retry?');
        break;
      default:
        console.error('Unknown error:', ack.error);
    }
  }
});
```

---

## Support

For issues or questions, please contact the backend team or refer to the main API documentation.
