# User Search API - Flow Diagram

## Request/Response Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  User types: "joh"                                               │
│       ↓                                                          │
│  Check length >= 2 chars ✓                                      │
│       ↓                                                          │
│  Debounce 300ms                                                  │
│       ↓                                                          │
│  GET /api/users/search?q=joh&limit=10                           │
│       ↓                                                          │
└───────┼───────────────────────────────────────────────────────────┘
        │
        │ HTTP Request
        ↓
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Route: GET /api/users/search                                   │
│       ↓                                                          │
│  Controller: searchUsers()                                       │
│       ↓                                                          │
│  Validate: query 'q' is required                                │
│       ↓                                                          │
│  Service: searchUsers(query, limit)                             │
│       ↓                                                          │
│  Repository: search()                                            │
│       ↓                                                          │
│  Database Query (Prisma):                                        │
│    WHERE name CONTAINS 'joh' (case-insensitive)                 │
│       OR email CONTAINS 'joh' (case-insensitive)                │
│    ORDER BY name ASC                                             │
│    LIMIT 10                                                      │
│       ↓                                                          │
│  Sanitize: Remove password field                                │
│       ↓                                                          │
│  Response: { data: [...users] }                                 │
│       ↓                                                          │
└───────┼───────────────────────────────────────────────────────────┘
        │
        │ HTTP Response
        ↓
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Receive: { data: [user1, user2, ...] }                         │
│       ↓                                                          │
│  Filter: Exclude already selected IDs                           │
│       ↓                                                          │
│  Render: Display user list with avatars                         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

```
┌──────────────┐
│ User Input   │  "john"
└──────┬───────┘
       │
       ↓
┌──────────────────────┐
│ Frontend Validation  │
│ - Min 2 chars        │
│ - Debounce 300ms     │
└──────┬───────────────┘
       │
       ↓
┌──────────────────────┐
│ API Request          │
│ GET /api/users/search│
│ ?q=john&limit=10     │
└──────┬───────────────┘
       │
       ↓
┌──────────────────────┐
│ Backend Processing   │
│ - Validate params    │
│ - Search DB          │
│ - Sanitize response  │
└──────┬───────────────┘
       │
       ↓
┌──────────────────────┐
│ Database Query       │
│ - Search name/email  │
│ - Case-insensitive   │
│ - Order by name      │
│ - Limit results      │
└──────┬───────────────┘
       │
       ↓
┌──────────────────────┐
│ Response             │
│ {                    │
│   data: [            │
│     {                │
│       id: "...",     │
│       name: "John",  │
│       email: "...",  │
│       avatarUrl: ... │
│     }                │
│   ]                  │
│ }                    │
└──────┬───────────────┘
       │
       ↓
┌──────────────────────┐
│ Frontend Processing  │
│ - Filter excluded    │
│ - Update UI          │
│ - Show results       │
└──────────────────────┘
```

---

## Component Integration

```
┌─────────────────────────────────────────────────────────────┐
│                    UserSearchComponent                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────┐    │
│  │  <input onChange={setQuery} />                      │    │
│  └────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │  useUserSearch(query, {                            │    │
│  │    minLength: 2,                                   │    │
│  │    debounceMs: 300,                                │    │
│  │    limit: 10,                                      │    │
│  │    excludeIds: selectedMemberIds                   │    │
│  │  })                                                │    │
│  └────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │  { users, loading, error }                         │    │
│  └────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │  {loading && <Spinner />}                          │    │
│  │  {error && <ErrorMessage />}                       │    │
│  │  {users.map(user => <UserItem />)}                 │    │
│  └────────────────────────────────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## State Management

```
┌─────────────────────────────────────────────────────────────┐
│                      useUserSearch Hook                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  State:                                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ users: User[]          → Search results             │   │
│  │ loading: boolean       → API call in progress       │   │
│  │ error: string | null   → Error message if failed    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  Effects:                                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ useEffect(() => {                                   │   │
│  │   if (query.length < minLength) {                   │   │
│  │     setUsers([]);                                   │   │
│  │     return;                                         │   │
│  │   }                                                 │   │
│  │                                                     │   │
│  │   const debouncedSearch = debounce(async () => {   │   │
│  │     setLoading(true);                               │   │
│  │     try {                                           │   │
│  │       const response = await axios.get(...);       │   │
│  │       const filtered = response.data.data.filter(  │   │
│  │         user => !excludeIds.includes(user.id)      │   │
│  │       );                                            │   │
│  │       setUsers(filtered);                           │   │
│  │     } catch (err) {                                 │   │
│  │       setError(err.message);                        │   │
│  │     } finally {                                     │   │
│  │       setLoading(false);                            │   │
│  │     }                                               │   │
│  │   }, debounceMs);                                   │   │
│  │                                                     │   │
│  │   debouncedSearch();                                │   │
│  │   return () => debouncedSearch.cancel();           │   │
│  │ }, [query, excludeIds]);                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      Error Scenarios                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Empty Query                                                 │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Frontend: Don't call API (query.length < 2)       │    │
│  │  Result: Show empty state or placeholder           │    │
│  └────────────────────────────────────────────────────┘    │
│                                                               │
│  Missing 'q' Parameter                                       │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Backend: Return 400 ValidationError                │    │
│  │  Frontend: Display error message                    │    │
│  │  "Search query is required"                         │    │
│  └────────────────────────────────────────────────────┘    │
│                                                               │
│  Network Error                                               │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Axios: Catch network error                         │    │
│  │  Frontend: Display "Failed to search users"         │    │
│  │  Retry: Allow user to retry search                  │    │
│  └────────────────────────────────────────────────────┘    │
│                                                               │
│  Server Error (500)                                          │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Backend: Return 500 InternalServerError            │    │
│  │  Frontend: Display "An unexpected error occurred"   │    │
│  │  Action: Log error, show retry option               │    │
│  └────────────────────────────────────────────────────┘    │
│                                                               │
│  No Results                                                  │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Backend: Return { data: [] }                       │    │
│  │  Frontend: Display "No users found"                 │    │
│  │  Suggestion: "Try a different search term"          │    │
│  └────────────────────────────────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Performance Optimization

```
┌─────────────────────────────────────────────────────────────┐
│                   Optimization Strategy                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Debouncing (300ms)                                       │
│     ┌────────────────────────────────────────────────┐     │
│     │  User types: "j" → "jo" → "joh" → "john"      │     │
│     │  API calls:   ✗     ✗      ✗       ✓          │     │
│     │  Saved: 3 unnecessary requests                 │     │
│     └────────────────────────────────────────────────┘     │
│                                                               │
│  2. Minimum Query Length (2 chars)                           │
│     ┌────────────────────────────────────────────────┐     │
│     │  User types: "j"                               │     │
│     │  API call: ✗ (too short)                       │     │
│     │  Benefit: Prevents overly broad searches       │     │
│     └────────────────────────────────────────────────┘     │
│                                                               │
│  3. Request Cancellation                                     │
│     ┌────────────────────────────────────────────────┐     │
│     │  User types: "john" → "jane" (quickly)         │     │
│     │  Request 1: Cancelled                           │     │
│     │  Request 2: Completed                           │     │
│     │  Benefit: Prevents race conditions             │     │
│     └────────────────────────────────────────────────┘     │
│                                                               │
│  4. Frontend Filtering (excludeIds)                          │
│     ┌────────────────────────────────────────────────┐     │
│     │  Backend returns: 10 users                      │     │
│     │  Frontend filters: 2 already selected           │     │
│     │  Display: 8 users                               │     │
│     │  Benefit: No backend changes needed             │     │
│     └────────────────────────────────────────────────┘     │
│                                                               │
│  5. Result Limiting                                          │
│     ┌────────────────────────────────────────────────┐     │
│     │  Default limit: 20 users                        │     │
│     │  Recommended: 10-15 for UI                      │     │
│     │  Benefit: Faster queries, better UX             │     │
│     └────────────────────────────────────────────────┘     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Integration Checklist

```
┌─────────────────────────────────────────────────────────────┐
│                    Implementation Steps                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  [ ] 1. Copy useUserSearch hook from documentation          │
│                                                               │
│  [ ] 2. Install dependencies                                 │
│         npm install lodash axios                             │
│         npm install -D @types/lodash                         │
│                                                               │
│  [ ] 3. Create types file (types/user.ts)                   │
│         interface User { ... }                               │
│                                                               │
│  [ ] 4. Implement search component                           │
│         - Input field with onChange                          │
│         - Use useUserSearch hook                             │
│         - Display results                                    │
│                                                               │
│  [ ] 5. Add loading state                                    │
│         {loading && <Spinner />}                             │
│                                                               │
│  [ ] 6. Add error handling                                   │
│         {error && <ErrorMessage />}                          │
│                                                               │
│  [ ] 7. Add empty state                                      │
│         {users.length === 0 && <NoResults />}               │
│                                                               │
│  [ ] 8. Handle avatar display                                │
│         src={avatarUrl || '/default-avatar.png'}            │
│                                                               │
│  [ ] 9. Add verification badge                               │
│         {user.verified && <Badge />}                         │
│                                                               │
│  [ ] 10. Test with various scenarios                         │
│          - Empty query                                       │
│          - Short query (< 2 chars)                           │
│          - Valid query                                       │
│          - No results                                        │
│          - Network error                                     │
│          - Already selected members                          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Reference

| Aspect | Value |
|--------|-------|
| **Endpoint** | `GET /api/users/search` |
| **Required Param** | `q` (search query) |
| **Optional Param** | `limit` (default: 20) |
| **Auth Required** | ❌ No |
| **Debounce** | ✅ 300ms recommended |
| **Min Length** | ✅ 2 chars recommended |
| **Exclude Support** | ❌ Filter on frontend |
| **Response Format** | `{ data: User[] }` |
| **Search Fields** | name, email (case-insensitive) |
| **Order** | Alphabetical by name |

---

**For complete details, see:**
- `docs/FRONTEND_USER_SEARCH_API.md` (Full documentation)
- `docs/FRONTEND_USER_SEARCH_QUICK_REFERENCE.md` (Quick reference)
- `docs/USER_SEARCH_API_RESPONSE.md` (Response to frontend questions)
