# Groups API Documentation

Base URL: `/api/groups`

## Overview

The Groups API provides endpoints for creating and managing groups, handling group memberships, roles, and invitations. All endpoints require authentication.

---

## Authentication

All endpoints require a valid JWT access token:

```
Authorization: Bearer <access_token>
```

---

## Group Roles

Groups support two roles:

- **ADMIN**: Can manage group settings, members, and invitations
- **MEMBER**: Can view group and participate but cannot manage

---

## Endpoints

### 1. Create Group

**POST** `/api/groups`

Creates a new group with the authenticated user as owner/admin.

**Authentication:** Required

#### Request Body

```json
{
  "name": "string",           // Required: Group name (min 1 character)
  "description": "string",    // Optional: Group description (max 500 characters)
  "avatarUrl": "string"       // Optional: Group avatar URL
}
```

#### Response

**Status:** `201 Created`

```json
{
  "id": "string",
  "name": "string",
  "description": "string|null",
  "avatarUrl": "string|null",
  "createdBy": "string",
  "createdAt": "string",
  "updatedAt": "string",
  "members": [
    {
      "userId": "string",
      "role": "ADMIN",
      "joinedAt": "string"
    }
  ]
}
```

#### Example Request

```javascript
// Using fetch
const accessToken = localStorage.getItem('accessToken');

const response = await fetch('http://localhost:3000/api/groups', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Project Team',
    description: 'Team collaboration for Project X',
    avatarUrl: '/uploads/avatars/group-avatar.png'
  })
});

const group = await response.json();
console.log('Group created:', group.id);
```

```javascript
// Using axios
import axios from 'axios';

const accessToken = localStorage.getItem('accessToken');

const { data } = await axios.post(
  'http://localhost:3000/api/groups',
  {
    name: 'Project Team',
    description: 'Team collaboration for Project X'
  },
  {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  }
);

console.log('Group created:', data);
```

#### Error Responses

**Status:** `400 Bad Request`
```json
{
  "error": "ValidationError",
  "message": "Group name is required"
}
```

**Status:** `401 Unauthorized`
```json
{
  "error": "UnauthorizedError",
  "message": "User authentication required"
}
```

---

### 2. List My Groups

**GET** `/api/groups/me`

Retrieves all groups the authenticated user is a member of.

**Authentication:** Required

#### Response

**Status:** `200 OK`

```json
{
  "data": [
    {
      "id": "string",
      "name": "string",
      "description": "string|null",
      "avatarUrl": "string|null",
      "createdBy": "string",
      "createdAt": "string",
      "updatedAt": "string",
      "members": [
        {
          "userId": "string",
          "role": "ADMIN|MEMBER",
          "joinedAt": "string"
        }
      ]
    }
  ]
}
```

#### Example Request

```javascript
// Using fetch
const accessToken = localStorage.getItem('accessToken');

const response = await fetch('http://localhost:3000/api/groups/me', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const { data: groups } = await response.json();
console.log(`You are in ${groups.length} groups`);
```

```javascript
// Using axios with React
import axios from 'axios';
import { useState, useEffect } from 'react';

function MyGroups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const { data } = await axios.get('http://localhost:3000/api/groups/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setGroups(data.data);
      } catch (error) {
        console.error('Failed to fetch groups:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchGroups();
  }, []);
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      <h2>My Groups ({groups.length})</h2>
      {groups.map(group => (
        <div key={group.id}>
          <h3>{group.name}</h3>
          <p>{group.description}</p>
          <p>{group.members.length} members</p>
        </div>
      ))}
    </div>
  );
}
```

---

### 3. Get Group

**GET** `/api/groups/:groupId`

Retrieves details of a specific group.

**Authentication:** Required (must be a member)

#### URL Parameters

- `groupId` (string, required): Group ID (UUID)

#### Response

**Status:** `200 OK`

```json
{
  "id": "string",
  "name": "string",
  "description": "string|null",
  "avatarUrl": "string|null",
  "createdBy": "string",
  "createdAt": "string",
  "updatedAt": "string",
  "members": [
    {
      "userId": "string",
      "role": "ADMIN|MEMBER",
      "joinedAt": "string"
    }
  ]
}
```

#### Example Request

```javascript
// Using fetch
const groupId = 'group-uuid-123';
const accessToken = localStorage.getItem('accessToken');

const response = await fetch(`http://localhost:3000/api/groups/${groupId}`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const group = await response.json();
console.log(group);
```

#### Error Responses

**Status:** `400 Bad Request`
```json
{
  "error": "ValidationError",
  "message": "Valid groupId is required"
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
  "message": "Group not found"
}
```

---

### 4. Update Group

**PATCH** `/api/groups/:groupId`

Updates group information. Only admins can update groups.

**Authentication:** Required (must be admin)

#### URL Parameters

- `groupId` (string, required): Group ID (UUID)

#### Request Body

```json
{
  "name": "string",           // Optional: New group name
  "description": "string|null", // Optional: New description (null to remove)
  "avatarUrl": "string|null"  // Optional: New avatar URL (null to remove)
}
```

**Note:** At least one field must be provided.

#### Response

**Status:** `200 OK`

```json
{
  "id": "string",
  "name": "string",
  "description": "string|null",
  "avatarUrl": "string|null",
  "createdBy": "string",
  "createdAt": "string",
  "updatedAt": "string",
  "members": [...]
}
```

#### Example Request

```javascript
// Using fetch
const groupId = 'group-uuid-123';
const accessToken = localStorage.getItem('accessToken');

const response = await fetch(`http://localhost:3000/api/groups/${groupId}`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Updated Group Name',
    description: 'New description'
  })
});

const updatedGroup = await response.json();
```

```javascript
// Using axios
import axios from 'axios';

const groupId = 'group-uuid-123';
const token = localStorage.getItem('accessToken');

const { data } = await axios.patch(
  `http://localhost:3000/api/groups/${groupId}`,
  {
    name: 'Updated Group Name',
    description: null  // Remove description
  },
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
);
```

#### Error Responses

**Status:** `400 Bad Request`
```json
{
  "error": "ValidationError",
  "message": "At least one field must be provided to update the group"
}
```

**Status:** `401 Unauthorized`
```json
{
  "error": "UnauthorizedError",
  "message": "Only admins can update group settings"
}
```

---

### 5. Delete Group

**DELETE** `/api/groups/:groupId`

Deletes a group. Only admins can delete groups.

**Authentication:** Required (must be admin)

#### URL Parameters

- `groupId` (string, required): Group ID (UUID)

#### Response

**Status:** `204 No Content`

No response body.

#### Example Request

```javascript
// Using fetch
const groupId = 'group-uuid-123';
const accessToken = localStorage.getItem('accessToken');

const response = await fetch(`http://localhost:3000/api/groups/${groupId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

if (response.status === 204) {
  console.log('Group deleted successfully');
}
```

```javascript
// Using axios with confirmation
import axios from 'axios';

async function deleteGroup(groupId) {
  if (!confirm('Are you sure you want to delete this group?')) {
    return;
  }
  
  try {
    const token = localStorage.getItem('accessToken');
    await axios.delete(`http://localhost:3000/api/groups/${groupId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('Group deleted successfully');
    // Redirect or update UI
  } catch (error) {
    console.error('Failed to delete group:', error);
  }
}
```

---

### 6. Add Member

**POST** `/api/groups/:groupId/members`

Adds a new member to the group. Only admins can add members.

**Authentication:** Required (must be admin)

#### URL Parameters

- `groupId` (string, required): Group ID (UUID)

#### Request Body

```json
{
  "userId": "string",         // Required: User ID (UUID)
  "role": "ADMIN|MEMBER"      // Optional: Member role (default: MEMBER)
}
```

#### Response

**Status:** `201 Created`

```json
{
  "id": "string",
  "name": "string",
  "description": "string|null",
  "avatarUrl": "string|null",
  "createdBy": "string",
  "createdAt": "string",
  "updatedAt": "string",
  "members": [
    {
      "userId": "string",
      "role": "ADMIN|MEMBER",
      "joinedAt": "string"
    }
  ]
}
```

#### Example Request

```javascript
// Using fetch
const groupId = 'group-uuid-123';
const userId = 'user-uuid-456';
const accessToken = localStorage.getItem('accessToken');

const response = await fetch(`http://localhost:3000/api/groups/${groupId}/members`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userId,
    role: 'MEMBER'
  })
});

const updatedGroup = await response.json();
console.log('Member added:', updatedGroup.members);
```

#### Error Responses

**Status:** `400 Bad Request`
```json
{
  "error": "ValidationError",
  "message": "Valid userId is required"
}
```

**Status:** `409 Conflict`
```json
{
  "error": "ConflictError",
  "message": "User is already a member of this group"
}
```

---

### 7. Update Member Role

**PATCH** `/api/groups/:groupId/members/:userId`

Updates a member's role. Only admins can update roles.

**Authentication:** Required (must be admin)

#### URL Parameters

- `groupId` (string, required): Group ID (UUID)
- `userId` (string, required): User ID (UUID)

#### Request Body

```json
{
  "role": "ADMIN|MEMBER"      // Required: New role
}
```

#### Response

**Status:** `200 OK`

```json
{
  "id": "string",
  "name": "string",
  "description": "string|null",
  "avatarUrl": "string|null",
  "createdBy": "string",
  "createdAt": "string",
  "updatedAt": "string",
  "members": [...]
}
```

#### Example Request

```javascript
// Using axios
import axios from 'axios';

const groupId = 'group-uuid-123';
const userId = 'user-uuid-456';
const token = localStorage.getItem('accessToken');

const { data } = await axios.patch(
  `http://localhost:3000/api/groups/${groupId}/members/${userId}`,
  { role: 'ADMIN' },
  { headers: { 'Authorization': `Bearer ${token}` } }
);

console.log('Member promoted to admin');
```

---

### 8. Remove Member

**DELETE** `/api/groups/:groupId/members/:userId`

Removes a member from the group. Admins can remove any member. Members can remove themselves.

**Authentication:** Required

#### URL Parameters

- `groupId` (string, required): Group ID (UUID)
- `userId` (string, required): User ID (UUID)

#### Response

**Status:** `200 OK`

```json
{
  "id": "string",
  "name": "string",
  "description": "string|null",
  "avatarUrl": "string|null",
  "createdBy": "string",
  "createdAt": "string",
  "updatedAt": "string",
  "members": [...]
}
```

#### Example Request

```javascript
// Using fetch - Leave group
const groupId = 'group-uuid-123';
const myUserId = 'my-user-id';
const accessToken = localStorage.getItem('accessToken');

const response = await fetch(
  `http://localhost:3000/api/groups/${groupId}/members/${myUserId}`,
  {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  }
);

const updatedGroup = await response.json();
console.log('Left group successfully');
```

---

### 9. Create Invitation

**POST** `/api/groups/:groupId/invite`

Creates an invitation token for joining the group. Only admins can create invitations.

**Authentication:** Required (must be admin)

#### URL Parameters

- `groupId` (string, required): Group ID (UUID)

#### Request Body

```json
{
  "email": "string",          // Optional: Invitee email
  "expiresInHours": number    // Optional: Expiration in hours (default: 72, max: 336)
}
```

#### Response

**Status:** `201 Created`

```json
{
  "id": "string",
  "groupId": "string",
  "inviterId": "string",
  "token": "string",
  "inviteeEmail": "string|null",
  "expiresAt": "string",
  "acceptedAt": null,
  "createdAt": "string"
}
```

#### Example Request

```javascript
// Using fetch
const groupId = 'group-uuid-123';
const accessToken = localStorage.getItem('accessToken');

const response = await fetch(`http://localhost:3000/api/groups/${groupId}/invite`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'newmember@example.com',
    expiresInHours: 48
  })
});

const invitation = await response.json();

// Share the invitation token
const inviteLink = `https://yourapp.com/join/${groupId}?token=${invitation.token}`;
console.log('Share this link:', inviteLink);
```

```javascript
// Using axios - Generate shareable link
import axios from 'axios';

async function generateInviteLink(groupId) {
  const token = localStorage.getItem('accessToken');
  
  const { data } = await axios.post(
    `http://localhost:3000/api/groups/${groupId}/invite`,
    { expiresInHours: 72 },
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  
  const inviteLink = `${window.location.origin}/join/${groupId}?token=${data.token}`;
  
  // Copy to clipboard
  await navigator.clipboard.writeText(inviteLink);
  alert('Invite link copied to clipboard!');
  
  return inviteLink;
}
```

#### Error Responses

**Status:** `400 Bad Request`
```json
{
  "error": "ValidationError",
  "message": "Expiration cannot exceed 14 days"
}
```

---

### 10. Join Group

**POST** `/api/groups/:groupId/join`

Joins a group using an invitation token.

**Authentication:** Required

#### URL Parameters

- `groupId` (string, required): Group ID (UUID)

#### Request Body

```json
{
  "token": "string"           // Required: Invitation token (min 10 characters)
}
```

#### Response

**Status:** `200 OK`

```json
{
  "id": "string",
  "name": "string",
  "description": "string|null",
  "avatarUrl": "string|null",
  "createdBy": "string",
  "createdAt": "string",
  "updatedAt": "string",
  "members": [...]
}
```

#### Example Request

```javascript
// Using fetch
const groupId = 'group-uuid-123';
const inviteToken = 'invitation-token-from-url';
const accessToken = localStorage.getItem('accessToken');

const response = await fetch(`http://localhost:3000/api/groups/${groupId}/join`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    token: inviteToken
  })
});

const group = await response.json();
console.log('Joined group:', group.name);
```

```javascript
// Using axios with URL parsing
import axios from 'axios';
import { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

function JoinGroupPage() {
  const { groupId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  useEffect(() => {
    if (groupId && token) {
      joinGroup();
    }
  }, [groupId, token]);
  
  const joinGroup = async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      
      const { data } = await axios.post(
        `http://localhost:3000/api/groups/${groupId}/join`,
        { token },
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      
      alert(`Successfully joined ${data.name}!`);
      // Redirect to group page
      window.location.href = `/groups/${groupId}`;
    } catch (error) {
      console.error('Failed to join group:', error);
      alert('Invalid or expired invitation link');
    }
  };
  
  return <div>Joining group...</div>;
}
```

#### Error Responses

**Status:** `400 Bad Request`
```json
{
  "error": "ValidationError",
  "message": "Invitation token is required"
}
```

```json
{
  "error": "ValidationError",
  "message": "Invalid or expired invitation token"
}
```

**Status:** `409 Conflict`
```json
{
  "error": "ConflictError",
  "message": "User is already a member of this group"
}
```

---

## Data Models

### Group Object

```typescript
interface Group {
  id: string;                 // UUID
  name: string;               // Group name
  description: string | null; // Group description
  avatarUrl: string | null;   // Group avatar URL
  createdBy: string;          // Creator user ID
  createdAt: string;          // ISO 8601 timestamp
  updatedAt: string;          // ISO 8601 timestamp
  members: GroupMember[];     // Array of members
}
```

### Group Member Object

```typescript
interface GroupMember {
  userId: string;             // User ID
  role: 'ADMIN' | 'MEMBER';   // Member role
  joinedAt: string;           // ISO 8601 timestamp
}
```

### Group Invitation Object

```typescript
interface GroupInvitation {
  id: string;                 // UUID
  groupId: string;            // Group ID
  inviterId: string;          // Inviter user ID
  token: string;              // Invitation token
  inviteeEmail: string | null; // Optional invitee email
  expiresAt: string;          // ISO 8601 timestamp
  acceptedAt: string | null;  // ISO 8601 timestamp or null
  createdAt: string;          // ISO 8601 timestamp
}
```

### Group Role Enum

```typescript
enum GroupRole {
  ADMIN = 'ADMIN',   // Can manage group, members, and invitations
  MEMBER = 'MEMBER'  // Can view and participate
}
```

---

## Complete Usage Examples

### Group Management Component (React)

```javascript
import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:3000';

function GroupManagement({ groupId }) {
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => {
    fetchGroup();
  }, [groupId]);
  
  const fetchGroup = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const { data } = await axios.get(`${API_BASE}/api/groups/${groupId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setGroup(data);
      
      // Check if current user is admin
      const currentUserId = getCurrentUserId(); // Your function
      const member = data.members.find(m => m.userId === currentUserId);
      setIsAdmin(member?.role === 'ADMIN');
    } catch (error) {
      console.error('Failed to fetch group:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const updateGroup = async (updates) => {
    try {
      const token = localStorage.getItem('accessToken');
      const { data } = await axios.patch(
        `${API_BASE}/api/groups/${groupId}`,
        updates,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setGroup(data);
    } catch (error) {
      console.error('Failed to update group:', error);
    }
  };
  
  const generateInvite = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const { data } = await axios.post(
        `${API_BASE}/api/groups/${groupId}/invite`,
        { expiresInHours: 72 },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      const link = `${window.location.origin}/join/${groupId}?token=${data.token}`;
      await navigator.clipboard.writeText(link);
      alert('Invite link copied!');
    } catch (error) {
      console.error('Failed to generate invite:', error);
    }
  };
  
  const removeMember = async (userId) => {
    if (!confirm('Remove this member?')) return;
    
    try {
      const token = localStorage.getItem('accessToken');
      const { data } = await axios.delete(
        `${API_BASE}/api/groups/${groupId}/members/${userId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setGroup(data);
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };
  
  const promoteMember = async (userId) => {
    try {
      const token = localStorage.getItem('accessToken');
      const { data } = await axios.patch(
        `${API_BASE}/api/groups/${groupId}/members/${userId}`,
        { role: 'ADMIN' },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setGroup(data);
    } catch (error) {
      console.error('Failed to promote member:', error);
    }
  };
  
  if (loading) return <div>Loading...</div>;
  if (!group) return <div>Group not found</div>;
  
  return (
    <div>
      <h1>{group.name}</h1>
      <p>{group.description}</p>
      
      {isAdmin && (
        <div>
          <button onClick={() => updateGroup({ name: 'New Name' })}>
            Edit Group
          </button>
          <button onClick={generateInvite}>
            Generate Invite Link
          </button>
        </div>
      )}
      
      <h2>Members ({group.members.length})</h2>
      {group.members.map(member => (
        <div key={member.userId}>
          <span>{member.userId}</span>
          <span>{member.role}</span>
          {isAdmin && member.role !== 'ADMIN' && (
            <>
              <button onClick={() => promoteMember(member.userId)}>
                Promote to Admin
              </button>
              <button onClick={() => removeMember(member.userId)}>
                Remove
              </button>
            </>
          )}
        </div>
      ))}
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
| 404 | NotFoundError | Group not found |
| 409 | ConflictError | Member already exists |
| 500 | InternalServerError | Server error |

---

## Permission Matrix

| Action | Admin | Member |
|--------|-------|--------|
| View group | ✓ | ✓ |
| Update group | ✓ | ✗ |
| Delete group | ✓ | ✗ |
| Add members | ✓ | ✗ |
| Remove members | ✓ | Self only |
| Update roles | ✓ | ✗ |
| Create invitations | ✓ | ✗ |
| Join via invitation | ✓ | ✓ |

---

## Support

For issues or questions, please contact the backend team or refer to the main API documentation.