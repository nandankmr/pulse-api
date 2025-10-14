# User Search API - Quick Reference

## TL;DR

```typescript
// Endpoint
GET /api/users/search?q={query}&limit={limit}

// Response
{
  data: Array<{
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    verified: boolean;
    createdAt: string;
    updatedAt: string;
  }>
}
```

---

## Quick Answers

| Question | Answer |
|----------|--------|
| **Endpoint** | `GET /api/users/search` |
| **Required Params** | `q` (search query) |
| **Optional Params** | `limit` (default: 20) |
| **Authentication** | ❌ Not required (public endpoint) |
| **Exclude Support** | ❌ Not supported - filter on frontend |
| **Min Query Length** | No backend requirement - recommend 2 chars on frontend |
| **Debouncing** | ✅ Recommended (300-500ms) - no backend rate limiting |
| **Response Format** | `{ data: User[] }` - no pagination metadata |
| **Search Fields** | Name and email (case-insensitive, partial match) |
| **Results Order** | Alphabetical by name (ascending) |

---

## Copy-Paste Hook

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

export function useUserSearch(
  query: string,
  options?: {
    minLength?: number;
    debounceMs?: number;
    limit?: number;
    excludeIds?: string[];
  }
) {
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
          '/api/users/search',
          { params: { q: searchQuery, limit } }
        );

        const filteredUsers = response.data.data.filter(
          user => !excludeIds.includes(user.id)
        );

        setUsers(filteredUsers);
      } catch (err) {
        setError(axios.isAxiosError(err) 
          ? err.response?.data?.message || 'Failed to search users'
          : 'An unexpected error occurred'
        );
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    searchUsers(query);
    return () => searchUsers.cancel();
  }, [query, minLength, debounceMs, limit, excludeIds.join(',')]);

  return { users, loading, error };
}
```

---

## Error Responses

```typescript
// 400 - Missing query
{
  "error": "ValidationError",
  "message": "Search query \"q\" is required"
}

// 500 - Server error
{
  "error": "InternalServerError",
  "message": "An unexpected error occurred"
}
```

---

## Important Notes

1. **No exclude parameter** - Filter already selected members on frontend
2. **No pagination** - Only returns top N results (use limit param)
3. **Avatar URLs are relative** - Prepend base URL: `${BASE_URL}${user.avatarUrl}`
4. **Public endpoint** - No auth required
5. **Case-insensitive search** - Matches both name and email
6. **Debounce recommended** - No backend rate limiting

---

## Full Documentation

See [FRONTEND_USER_SEARCH_API.md](./FRONTEND_USER_SEARCH_API.md) for complete details.
