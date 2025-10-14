# Users API Documentation

Base URL: `/api/users`

## Overview

The Users API provides endpoints for user management including retrieving user profiles, searching users, updating profiles, and uploading avatars. Some endpoints require authentication.

---

## Authentication

Protected endpoints require a valid JWT access token in the Authorization header:

```
Authorization: Bearer <access_token>
```

---

## Endpoints

### 1. Get User by ID

**GET** `/api/users/:id`

Retrieves a single user by their ID.

**Authentication:** Not required

#### URL Parameters

- `id` (string, required): User ID (UUID)

#### Response

**Status:** `200 OK`

```json
{
  "id": "string",
  "name": "string",
  "email": "string",
  "avatarUrl": "string|null",
  "verified": true,
  "createdAt": "string",
  "updatedAt": "string"
}
```

#### Example Request

```javascript
// Using fetch
const userId = 'user-uuid-123';
const response = await fetch(`http://localhost:3000/api/users/${userId}`);
const user = await response.json();
console.log(user);
```

```javascript
// Using axios
import axios from 'axios';

const userId = 'user-uuid-123';
const { data } = await axios.get(`http://localhost:3000/api/users/${userId}`);
console.log(data);
```

#### Error Responses

**Status:** `400 Bad Request`
```json
{
  "error": "ValidationError",
  "message": "User ID is required"
}
```

**Status:** `404 Not Found`
```json
{
  "error": "NotFoundError",
  "message": "User not found"
}
```

---

### 2. Get All Users

**GET** `/api/users`

Retrieves a paginated list of all users.

**Authentication:** Not required

#### Query Parameters

- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10)

#### Response

**Status:** `200 OK`

```json
{
  "data": [
    {
      "id": "string",
      "name": "string",
      "email": "string",
      "avatarUrl": "string|null",
      "verified": true,
      "createdAt": "string",
      "updatedAt": "string"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

#### Example Request

```javascript
// Using fetch
const response = await fetch('http://localhost:3000/api/users?page=1&limit=20');
const result = await response.json();

console.log(`Showing ${result.data.length} of ${result.pagination.total} users`);
result.data.forEach(user => console.log(user.name));
```

```javascript
// Using axios with React
import axios from 'axios';
import { useState, useEffect } from 'react';

function UsersList() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  
  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await axios.get('http://localhost:3000/api/users', {
        params: { page, limit: 20 }
      });
      
      setUsers(data.data);
      setPagination(data.pagination);
    };
    
    fetchUsers();
  }, [page]);
  
  return (
    <div>
      {users.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
      
      <button onClick={() => setPage(p => p - 1)} disabled={page === 1}>
        Previous
      </button>
      <span>Page {page} of {pagination?.totalPages}</span>
      <button onClick={() => setPage(p => p + 1)} disabled={page === pagination?.totalPages}>
        Next
      </button>
    </div>
  );
}
```

---

### 3. Search Users

**GET** `/api/users/search`

Searches for users by name or email.

**Authentication:** Not required

#### Query Parameters

- `q` (string, required): Search query
- `limit` (number, optional): Maximum results (default: 20)

#### Response

**Status:** `200 OK`

```json
{
  "data": [
    {
      "id": "string",
      "name": "string",
      "email": "string",
      "avatarUrl": "string|null",
      "verified": true,
      "createdAt": "string",
      "updatedAt": "string"
    }
  ]
}
```

#### Example Request

```javascript
// Using fetch
const searchQuery = 'john';
const response = await fetch(
  `http://localhost:3000/api/users/search?q=${encodeURIComponent(searchQuery)}&limit=10`
);
const result = await response.json();
console.log(`Found ${result.data.length} users`);
```

```javascript
// Using axios with debounce (React example)
import axios from 'axios';
import { useState, useEffect } from 'react';
import { debounce } from 'lodash';

function UserSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const searchUsers = debounce(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }
    
    setLoading(true);
    try {
      const { data } = await axios.get('http://localhost:3000/api/users/search', {
        params: { q: searchQuery, limit: 10 }
      });
      setResults(data.data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, 300);
  
  useEffect(() => {
    searchUsers(query);
  }, [query]);
  
  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search users..."
      />
      
      {loading && <div>Searching...</div>}
      
      {results.map(user => (
        <div key={user.id}>
          <img src={user.avatarUrl || '/default-avatar.png'} alt={user.name} />
          <span>{user.name}</span>
          <span>{user.email}</span>
        </div>
      ))}
    </div>
  );
}
```

#### Error Responses

**Status:** `400 Bad Request`
```json
{
  "error": "ValidationError",
  "message": "Search query \"q\" is required"
}
```

---

### 4. Create User

**POST** `/api/users`

Creates a new user (alternative to registration endpoint).

**Authentication:** Not required

#### Request Body

```json
{
  "name": "string",      // Required: User's full name
  "email": "string",     // Required: Valid email address
  "password": "string"   // Required: User's password
}
```

#### Response

**Status:** `201 Created`

```json
{
  "id": "string",
  "name": "string",
  "email": "string",
  "avatarUrl": null,
  "verified": false,
  "createdAt": "string",
  "updatedAt": "string"
}
```

#### Example Request

```javascript
// Using fetch
const response = await fetch('http://localhost:3000/api/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    password: 'SecurePass456!'
  })
});

const user = await response.json();
console.log('User created:', user.id);
```

#### Error Responses

**Status:** `400 Bad Request`
```json
{
  "error": "ValidationError",
  "message": "Name, email, and password are required"
}
```

**Status:** `409 Conflict`
```json
{
  "error": "ConflictError",
  "message": "Email already in use"
}
```

---

### 5. Update Profile

**PUT** `/api/users/me`

Updates the authenticated user's profile.

**Authentication:** Required

#### Request Headers

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

#### Request Body

```json
{
  "name": "string",      // Optional: New name
  "password": "string"   // Optional: New password
}
```

#### Response

**Status:** `200 OK`

```json
{
  "id": "string",
  "name": "string",
  "email": "string",
  "avatarUrl": "string|null",
  "verified": true,
  "createdAt": "string",
  "updatedAt": "string"
}
```

#### Example Request

```javascript
// Using fetch
const accessToken = localStorage.getItem('accessToken');

const response = await fetch('http://localhost:3000/api/users/me', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'John Doe Updated'
  })
});

const updatedUser = await response.json();
console.log('Profile updated:', updatedUser);
```

```javascript
// Using axios
import axios from 'axios';

const accessToken = localStorage.getItem('accessToken');

const { data } = await axios.put(
  'http://localhost:3000/api/users/me',
  {
    name: 'John Doe Updated',
    password: 'NewSecurePass789!'
  },
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  }
);

console.log('Profile updated:', data);
```

#### Error Responses

**Status:** `401 Unauthorized`
```json
{
  "error": "UnauthorizedError",
  "message": "User authentication required"
}
```

#### Notes
- Both fields are optional - you can update just name, just password, or both
- Password will be hashed before storage
- Email cannot be changed through this endpoint

---

### 6. Upload Avatar

**POST** `/api/users/me/avatar`

Uploads a new avatar image for the authenticated user.

**Authentication:** Required

#### Request Headers

```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

#### Request Body (multipart/form-data)

- `avatar` (file, required): Image file (JPEG, PNG, GIF, WebP)

#### Response

**Status:** `200 OK`

```json
{
  "id": "string",
  "name": "string",
  "email": "string",
  "avatarUrl": "/uploads/avatars/filename.jpg",
  "verified": true,
  "createdAt": "string",
  "updatedAt": "string"
}
```

#### Example Request

```javascript
// Using fetch with file input
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];

const formData = new FormData();
formData.append('avatar', file);

const accessToken = localStorage.getItem('accessToken');

const response = await fetch('http://localhost:3000/api/users/me/avatar', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
  body: formData
});

const updatedUser = await response.json();
console.log('Avatar uploaded:', updatedUser.avatarUrl);
```

```javascript
// Using axios with React
import axios from 'axios';
import { useState } from 'react';

function AvatarUpload() {
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  
  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('avatar', file);
    
    const accessToken = localStorage.getItem('accessToken');
    
    setUploading(true);
    try {
      const { data } = await axios.post(
        'http://localhost:3000/api/users/me/avatar',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      setAvatarUrl(data.avatarUrl);
      console.log('Avatar uploaded successfully');
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={uploading}
      />
      
      {uploading && <div>Uploading...</div>}
      
      {avatarUrl && (
        <img
          src={`http://localhost:3000${avatarUrl}`}
          alt="Avatar"
          style={{ width: 100, height: 100, borderRadius: '50%' }}
        />
      )}
    </div>
  );
}
```

```javascript
// Using axios with preview
function AvatarUploadWithPreview() {
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
    
    // Upload
    const formData = new FormData();
    formData.append('avatar', file);
    
    const accessToken = localStorage.getItem('accessToken');
    
    setUploading(true);
    try {
      const { data } = await axios.post(
        'http://localhost:3000/api/users/me/avatar',
        formData,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            console.log(`Upload progress: ${percentCompleted}%`);
          }
        }
      );
      
      console.log('Upload complete:', data.avatarUrl);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div>
      <input type="file" accept="image/*" onChange={handleFileChange} />
      {preview && <img src={preview} alt="Preview" style={{ width: 100 }} />}
      {uploading && <div>Uploading...</div>}
    </div>
  );
}
```

#### Error Responses

**Status:** `400 Bad Request`
```json
{
  "error": "ValidationError",
  "message": "Avatar file is required"
}
```

**Status:** `401 Unauthorized`
```json
{
  "error": "UnauthorizedError",
  "message": "User authentication required"
}
```

#### Notes
- Supported formats: JPEG, PNG, GIF, WebP
- File size limits may apply (check server configuration)
- Old avatar is replaced with new one
- Avatar URL is relative and should be prefixed with base URL
- Avatars are served from `/uploads/avatars/` endpoint

---

## Data Models

### User Object

```typescript
interface User {
  id: string;              // UUID
  name: string;            // User's full name
  email: string;           // User's email
  avatarUrl: string | null; // Relative path to avatar
  verified: boolean;       // Email verification status
  createdAt: string;       // ISO 8601 timestamp
  updatedAt: string;       // ISO 8601 timestamp
}
```

### Paginated Response

```typescript
interface PaginatedResponse<T> {
  data: T[];               // Array of items
  pagination: {
    page: number;          // Current page
    limit: number;         // Items per page
    total: number;         // Total items
    totalPages: number;    // Total pages
  };
}
```

---

## Complete Usage Examples

### User Profile Component (React)

```javascript
import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:3000';

function UserProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '' });
  
  useEffect(() => {
    fetchProfile();
  }, []);
  
  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const { data } = await axios.get(`${API_BASE}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(data);
      setFormData({ name: data.name });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const updateProfile = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('accessToken');
      const { data } = await axios.put(
        `${API_BASE}/api/users/me`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUser(data);
      setEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };
  
  const uploadAvatar = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
      const token = localStorage.getItem('accessToken');
      const { data } = await axios.post(
        `${API_BASE}/api/users/me/avatar`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUser(data);
    } catch (error) {
      console.error('Failed to upload avatar:', error);
    }
  };
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Not logged in</div>;
  
  return (
    <div>
      <div>
        <img
          src={user.avatarUrl ? `${API_BASE}${user.avatarUrl}` : '/default-avatar.png'}
          alt={user.name}
          style={{ width: 100, height: 100, borderRadius: '50%' }}
        />
        <input type="file" accept="image/*" onChange={uploadAvatar} />
      </div>
      
      {editing ? (
        <form onSubmit={updateProfile}>
          <input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <button type="submit">Save</button>
          <button type="button" onClick={() => setEditing(false)}>Cancel</button>
        </form>
      ) : (
        <div>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
          <p>Verified: {user.verified ? '✓' : '✗'}</p>
          <button onClick={() => setEditing(true)}>Edit Profile</button>
        </div>
      )}
    </div>
  );
}
```

---

## Common Error Codes

| Status Code | Error Type | Description |
|-------------|------------|-------------|
| 400 | ValidationError | Invalid request data |
| 401 | UnauthorizedError | Missing or invalid authentication |
| 404 | NotFoundError | User not found |
| 409 | ConflictError | Email already exists |
| 500 | InternalServerError | Server error |

---

## Support

For issues or questions, please contact the backend team or refer to the main API documentation.
