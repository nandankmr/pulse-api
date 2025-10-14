# User Search API - Frontend Integration Guide

## Overview

This document provides complete details for integrating the User Search API into your frontend application. All information is based on the actual backend implementation.

---

## 1. API Endpoint

**Endpoint:** `GET /api/users/search`

**Full URL:** `http://localhost:3000/api/users/search`

---

## 2. Request Parameters

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | string | **Yes** | - | Search query to match against user names and emails |
| `limit` | number | No | 20 | Maximum number of results to return |

### Notes on Parameters

- **`q` (query):**
  - Must be a non-empty string
  - Searches both `name` and `email` fields (case-insensitive)
  - Uses partial matching (e.g., "john" matches "John Doe" and "john@example.com")
  - Backend will return `400 Bad Request` if empty or missing

- **`limit`:**
  - Controls maximum results returned
  - Default is 20 if not specified
  - No pagination support (offset/page) - returns top N matches

- **`exclude`:**
  - **Not currently supported** by the backend
  - If you need to exclude already selected members, filter them on the frontend

---

## 3. Response Structure

### Success Response

**Status:** `200 OK`

**Content-Type:** `application/json`

```typescript
{
  data: Array<{
    id: string;              // UUID
    name: string;            // User's full name
    email: string;           // User's email address
    avatarUrl: string | null; // Relative path to avatar (e.g., "/uploads/avatars/abc.jpg")
    verified: boolean;       // Email verification status
    createdAt: string;       // ISO 8601 timestamp
    updatedAt: string;       // ISO 8601 timestamp
  }>
}
```

### TypeScript Interface

```typescript
interface UserSearchResponse {
  data: User[];
}

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Example Response

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "avatarUrl": "/uploads/avatars/john-avatar.jpg",
      "verified": true,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-20T14:45:00.000Z"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Johnny Smith",
      "email": "johnny.smith@example.com",
      "avatarUrl": null,
      "verified": false,
      "createdAt": "2024-02-01T08:15:00.000Z",
      "updatedAt": "2024-02-01T08:15:00.000Z"
    }
  ]
}
```

### Important Notes

- **No pagination metadata:** Unlike `/api/users`, this endpoint does not return `total`, `page`, or `totalPages`
- **Results are ordered by name** (ascending alphabetically)
- **Password field is excluded** from the response (sanitized by backend)
- **Avatar URLs are relative paths** - prepend your base URL (e.g., `http://localhost:3000${avatarUrl}`)

---

## 4. Additional Questions - Answered

### Minimum Query Length

**Backend Requirement:** No minimum length enforced by backend

**Recommendation:** Implement a minimum of **2 characters** on the frontend to:
- Reduce unnecessary API calls
- Improve user experience
- Prevent overly broad searches

```typescript
// Recommended frontend validation
if (query.trim().length < 2) {
  return; // Don't make API call
}
```

### Debouncing

**Backend Rate Limiting:** No rate limiting currently implemented on backend

**Recommendation:** **Yes, implement debouncing on the frontend**
- Suggested delay: **300-500ms**
- Prevents excessive API calls while user is typing
- Improves performance and reduces server load

```typescript
import { debounce } from 'lodash';

const debouncedSearch = debounce(async (query: string) => {
  // Make API call
}, 300);
```

### Authentication

**Authentication Required:** **No**

- This is a **public endpoint**
- No `Authorization` header needed
- Anyone can search for users
- If you want to restrict this in the future, you'll need to modify the backend route

### Error Responses

#### 400 Bad Request - Missing Query

```json
{
  "error": "ValidationError",
  "message": "Search query \"q\" is required"
}
```

**When it occurs:** When `q` parameter is missing or empty

#### 500 Internal Server Error

```json
{
  "error": "InternalServerError",
  "message": "An unexpected error occurred"
}
```

**When it occurs:** Database errors or unexpected server issues

---

## 5. Implementation Example

### Custom Hook: `useUserSearch`

```typescript
import { useState, useEffect } from 'react';
import axios from 'axios';
import { debounce } from 'lodash';

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UseUserSearchResult {
  users: User[];
  loading: boolean;
  error: string | null;
}

export function useUserSearch(
  query: string,
  options?: {
    minLength?: number;
    debounceMs?: number;
    limit?: number;
    excludeIds?: string[];
  }
): UseUserSearchResult {
  const {
    minLength = 2,
    debounceMs = 300,
    limit = 20,
    excludeIds = []
  } = options || {};

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Clear results if query is too short
    if (query.trim().length < minLength) {
      setUsers([]);
      setLoading(false);
      setError(null);
      return;
    }

    const searchUsers = debounce(async (searchQuery: string) => {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.get<{ data: User[] }>(
          'http://localhost:3000/api/users/search',
          {
            params: {
              q: searchQuery,
              limit
            }
          }
        );

        // Filter out excluded IDs on frontend
        const filteredUsers = response.data.data.filter(
          user => !excludeIds.includes(user.id)
        );

        setUsers(filteredUsers);
      } catch (err) {
        if (axios.isAxiosError(err)) {
          setError(err.response?.data?.message || 'Failed to search users');
        } else {
          setError('An unexpected error occurred');
        }
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    searchUsers(query);

    // Cleanup
    return () => {
      searchUsers.cancel();
    };
  }, [query, minLength, debounceMs, limit, excludeIds.join(',')]);

  return { users, loading, error };
}
```

### Usage Example

```typescript
import { useState } from 'react';
import { useUserSearch } from './hooks/useUserSearch';

function UserSearchComponent({ selectedMemberIds }: { selectedMemberIds: string[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const { users, loading, error } = useUserSearch(searchQuery, {
    minLength: 2,
    debounceMs: 300,
    limit: 10,
    excludeIds: selectedMemberIds // Filter out already selected members
  });

  return (
    <div>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search users by name or email..."
      />

      {loading && <div>Searching...</div>}
      {error && <div className="error">{error}</div>}

      <div className="results">
        {users.map(user => (
          <div key={user.id} className="user-item">
            <img
              src={user.avatarUrl 
                ? `http://localhost:3000${user.avatarUrl}` 
                : '/default-avatar.png'
              }
              alt={user.name}
            />
            <div>
              <div className="name">{user.name}</div>
              <div className="email">{user.email}</div>
            </div>
            {user.verified && <span className="verified-badge">✓</span>}
          </div>
        ))}

        {!loading && searchQuery.length >= 2 && users.length === 0 && (
          <div>No users found</div>
        )}
      </div>
    </div>
  );
}
```

---

## 6. Backend Implementation Details

For reference, here's what the backend does:

### Search Logic

```typescript
// Searches both name and email fields (case-insensitive)
// Uses partial matching with Prisma's 'contains' operator
// Orders results alphabetically by name
const users = await prisma.user.findMany({
  where: {
    OR: [
      { name: { contains: query, mode: 'insensitive' } },
      { email: { contains: query, mode: 'insensitive' } },
    ],
  },
  orderBy: { name: 'asc' },
  take: limit,
});
```

### Response Sanitization

- Password field is **always removed** from the response
- All other user fields are included
- No additional filtering or transformations

---

## 7. Testing

### Manual Testing with cURL

```bash
# Basic search
curl "http://localhost:3000/api/users/search?q=john"

# With limit
curl "http://localhost:3000/api/users/search?q=john&limit=5"

# Error case - missing query
curl "http://localhost:3000/api/users/search"
```

### Testing with Postman

1. **Method:** GET
2. **URL:** `http://localhost:3000/api/users/search`
3. **Query Params:**
   - `q`: `john`
   - `limit`: `10`
4. **Headers:** None required

---

## 8. Best Practices

### Frontend Recommendations

1. **Debounce search input** (300-500ms)
2. **Minimum query length** of 2 characters
3. **Show loading state** while searching
4. **Handle empty results** gracefully
5. **Filter excluded members** on frontend (backend doesn't support this)
6. **Display user avatars** with fallback for null values
7. **Show verification badge** for verified users
8. **Handle errors** with user-friendly messages

### Performance Tips

1. **Limit results** to what you can display (10-20 is reasonable)
2. **Cancel previous requests** when new search is triggered
3. **Cache results** if the same query is repeated
4. **Virtualize long lists** if displaying many results

---

## 9. Future Enhancements

If you need these features, please request backend changes:

- [ ] **Exclude parameter** - to filter out already selected users
- [ ] **Pagination support** - for large result sets
- [ ] **Additional filters** - by verification status, date range, etc.
- [ ] **Authentication requirement** - to restrict access
- [ ] **Rate limiting** - to prevent abuse
- [ ] **Search by specific fields** - separate name/email search
- [ ] **Fuzzy matching** - for typo tolerance

---

## 10. Related Documentation

- [Full Users API Documentation](./api-users.md)
- [Authentication API](./api-auth.md)
- [Chat API](./api-chat.md)

---

## Support

For questions or issues:
- Check the [main API documentation](./api-users.md)
- Review the backend implementation in `/src/modules/user/`
- Contact the backend team

**Last Updated:** October 14, 2025
