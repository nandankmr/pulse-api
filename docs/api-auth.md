# Authentication API Documentation

Base URL: `/api/auth`

## Overview

The Authentication API provides endpoints for user registration, login, token refresh, and email verification. All authentication endpoints use JWT (JSON Web Tokens) for session management with device-based refresh tokens.

---

## Endpoints

### 1. Register User

**POST** `/api/auth/register`

Creates a new user account and returns authentication tokens.

#### Request Body

```json
{
  "name": "string",           // Required: User's full name (min 1 character)
  "email": "string",          // Required: Valid email address
  "password": "string",       // Required: Password (min 8 characters)
  "deviceId": "string",       // Optional: Unique device identifier
  "deviceName": "string",     // Optional: Device name (e.g., "iPhone 14 Pro")
  "platform": "string"        // Optional: Platform (e.g., "ios", "android", "web")
}
```

#### Response

**Status:** `201 Created`

```json
{
  "user": {
    "id": "string",           // UUID
    "name": "string",
    "email": "string",
    "avatarUrl": "string|null",
    "verified": false,        // Email not verified yet
    "createdAt": "string",    // ISO 8601 timestamp
    "updatedAt": "string"     // ISO 8601 timestamp
  },
  "tokens": {
    "accessToken": "string",  // JWT access token
    "refreshToken": "string", // JWT refresh token
    "deviceId": "string"      // Device identifier for this session
  }
}
```

#### Example Request

```javascript
// Using fetch
const response = await fetch('http://localhost:3000/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john.doe@example.com',
    password: 'SecurePass123!',
    deviceId: 'device-uuid-12345',
    deviceName: 'iPhone 14 Pro',
    platform: 'ios'
  })
});

const data = await response.json();
console.log(data);
```

```javascript
// Using axios
import axios from 'axios';

const { data } = await axios.post('http://localhost:3000/api/auth/register', {
  name: 'John Doe',
  email: 'john.doe@example.com',
  password: 'SecurePass123!',
  deviceId: 'device-uuid-12345',
  deviceName: 'iPhone 14 Pro',
  platform: 'ios'
});

console.log(data);
```

#### Error Responses

**Status:** `400 Bad Request`
```json
{
  "error": "ValidationError",
  "message": "Name is required" // or other validation messages
}
```

**Status:** `409 Conflict`
```json
{
  "error": "ConflictError",
  "message": "Email already in use"
}
```

#### Notes
- After registration, a verification email with a 6-digit OTP is sent to the user's email
- The OTP expires in 10 minutes
- User can use the app without email verification, but some features may be restricted
- If `deviceId` is not provided, a new UUID will be generated

---

### 2. Login

**POST** `/api/auth/login`

Authenticates a user and returns authentication tokens.

#### Request Body

```json
{
  "email": "string",          // Required: Valid email address
  "password": "string",       // Required: User's password
  "deviceId": "string",       // Optional: Unique device identifier
  "deviceName": "string",     // Optional: Device name
  "platform": "string"        // Optional: Platform identifier
}
```

#### Response

**Status:** `200 OK`

```json
{
  "user": {
    "id": "string",
    "name": "string",
    "email": "string",
    "avatarUrl": "string|null",
    "verified": true,         // Email verification status
    "createdAt": "string",
    "updatedAt": "string"
  },
  "tokens": {
    "accessToken": "string",
    "refreshToken": "string",
    "deviceId": "string"
  }
}
```

#### Example Request

```javascript
// Using fetch
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'john.doe@example.com',
    password: 'SecurePass123!',
    deviceId: 'device-uuid-12345',
    platform: 'web'
  })
});

const data = await response.json();

// Store tokens securely
localStorage.setItem('accessToken', data.tokens.accessToken);
localStorage.setItem('refreshToken', data.tokens.refreshToken);
localStorage.setItem('deviceId', data.tokens.deviceId);
```

```javascript
// Using axios
import axios from 'axios';

const { data } = await axios.post('http://localhost:3000/api/auth/login', {
  email: 'john.doe@example.com',
  password: 'SecurePass123!',
  deviceId: 'device-uuid-12345',
  platform: 'web'
});

// Store tokens
localStorage.setItem('accessToken', data.tokens.accessToken);
localStorage.setItem('refreshToken', data.tokens.refreshToken);
localStorage.setItem('deviceId', data.tokens.deviceId);
```

#### Error Responses

**Status:** `400 Bad Request`
```json
{
  "error": "ValidationError",
  "message": "Valid email is required"
}
```

**Status:** `401 Unauthorized`
```json
{
  "error": "UnauthorizedError",
  "message": "Invalid email or password"
}
```

#### Notes
- Each device gets its own refresh token session
- Multiple devices can be logged in simultaneously
- Access tokens expire based on `ACCESS_TOKEN_TTL` environment variable (default: 1 hour)
- Refresh tokens expire based on `REFRESH_TOKEN_TTL` environment variable (default: 7 days)

---

### 3. Refresh Token

**POST** `/api/auth/refresh`

Refreshes the access token using a valid refresh token.

#### Request Body

```json
{
  "refreshToken": "string",   // Required: Valid refresh token
  "deviceId": "string"        // Optional: Device identifier (recommended)
}
```

#### Response

**Status:** `200 OK`

```json
{
  "user": {
    "id": "string",
    "name": "string",
    "email": "string",
    "avatarUrl": "string|null",
    "verified": true,
    "createdAt": "string",
    "updatedAt": "string"
  },
  "tokens": {
    "accessToken": "string",  // New access token
    "refreshToken": "string", // New refresh token
    "deviceId": "string"
  }
}
```

#### Example Request

```javascript
// Using fetch
const refreshToken = localStorage.getItem('refreshToken');
const deviceId = localStorage.getItem('deviceId');

const response = await fetch('http://localhost:3000/api/auth/refresh', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    refreshToken,
    deviceId
  })
});

const data = await response.json();

// Update stored tokens
localStorage.setItem('accessToken', data.tokens.accessToken);
localStorage.setItem('refreshToken', data.tokens.refreshToken);
```

```javascript
// Using axios with interceptor (recommended pattern)
import axios from 'axios';

// Setup axios interceptor to automatically refresh tokens
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const deviceId = localStorage.getItem('deviceId');
        
        const { data } = await axios.post('http://localhost:3000/api/auth/refresh', {
          refreshToken,
          deviceId
        });
        
        localStorage.setItem('accessToken', data.tokens.accessToken);
        localStorage.setItem('refreshToken', data.tokens.refreshToken);
        
        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${data.tokens.accessToken}`;
        return axios(originalRequest);
      } catch (refreshError) {
        // Redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);
```

#### Error Responses

**Status:** `400 Bad Request`
```json
{
  "error": "ValidationError",
  "message": "Refresh token is required"
}
```

**Status:** `401 Unauthorized`
```json
{
  "error": "UnauthorizedError",
  "message": "Invalid refresh token"
}
```

```json
{
  "error": "UnauthorizedError",
  "message": "Device context missing for refresh"
}
```

```json
{
  "error": "UnauthorizedError",
  "message": "Invalid refresh session"
}
```

#### Notes
- Both access and refresh tokens are rotated on each refresh
- The old refresh token becomes invalid after a successful refresh
- Device ID is required for security (prevents token theft across devices)
- If refresh fails, user should be redirected to login

---

### 4. Verify Email

**POST** `/api/auth/verify-email`

Verifies a user's email address using the OTP sent during registration.

#### Request Body

```json
{
  "email": "string",          // Required: User's email address
  "otp": "string"             // Required: 6-digit OTP code
}
```

#### Response

**Status:** `200 OK`

```json
{
  "user": {
    "id": "string",
    "name": "string",
    "email": "string",
    "avatarUrl": "string|null",
    "verified": true,         // Now verified
    "createdAt": "string",
    "updatedAt": "string"
  }
}
```

#### Example Request

```javascript
// Using fetch
const response = await fetch('http://localhost:3000/api/auth/verify-email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'john.doe@example.com',
    otp: '123456'
  })
});

const data = await response.json();
console.log('Email verified:', data.user.verified);
```

```javascript
// Using axios
import axios from 'axios';

const { data } = await axios.post('http://localhost:3000/api/auth/verify-email', {
  email: 'john.doe@example.com',
  otp: '123456'
});

console.log('Email verified:', data.user.verified);
```

#### Error Responses

**Status:** `400 Bad Request`
```json
{
  "error": "ValidationError",
  "message": "OTP must be 6 digits"
}
```

```json
{
  "error": "ValidationError",
  "message": "OTP must contain only digits"
}
```

```json
{
  "error": "ValidationError",
  "message": "Invalid verification code"
}
```

```json
{
  "error": "ValidationError",
  "message": "Verification code has expired"
}
```

**Status:** `404 Not Found`
```json
{
  "error": "NotFoundError",
  "message": "User not found"
}
```

#### Notes
- OTP is valid for 10 minutes after generation
- After successful verification, all pending verification tokens for that user are deleted
- A new OTP can be requested by registering again or through a resend endpoint (if implemented)
- OTP must be exactly 6 digits

---

## Authentication Flow

### Registration Flow

```
1. User submits registration form
   ↓
2. POST /api/auth/register
   ↓
3. Server creates user account
   ↓
4. Server sends verification email with OTP
   ↓
5. Server returns user data + tokens
   ↓
6. Frontend stores tokens
   ↓
7. User enters OTP from email
   ↓
8. POST /api/auth/verify-email
   ↓
9. Email verified ✓
```

### Login Flow

```
1. User submits login form
   ↓
2. POST /api/auth/login
   ↓
3. Server validates credentials
   ↓
4. Server returns user data + tokens
   ↓
5. Frontend stores tokens
   ↓
6. User is authenticated ✓
```

### Token Refresh Flow

```
1. API request fails with 401
   ↓
2. POST /api/auth/refresh with refreshToken
   ↓
3. Server validates refresh token
   ↓
4. Server returns new tokens
   ↓
5. Frontend updates stored tokens
   ↓
6. Retry original request with new accessToken
```

---

## Security Best Practices

### Token Storage

**Web Applications:**
```javascript
// Store in localStorage or sessionStorage
localStorage.setItem('accessToken', token);

// Or use httpOnly cookies (requires backend changes)
// This is more secure as tokens can't be accessed by JavaScript
```

**Mobile Applications:**
```javascript
// Use secure storage
// iOS: Keychain
// Android: Keystore
import * as SecureStore from 'expo-secure-store';

await SecureStore.setItemAsync('accessToken', token);
```

### Making Authenticated Requests

```javascript
// Add Authorization header to all protected requests
const response = await fetch('http://localhost:3000/api/users/me', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
    'Content-Type': 'application/json'
  }
});
```

```javascript
// Using axios - set default header
import axios from 'axios';

axios.defaults.headers.common['Authorization'] = 
  `Bearer ${localStorage.getItem('accessToken')}`;
```

### Logout

```javascript
// Clear all stored tokens
localStorage.removeItem('accessToken');
localStorage.removeItem('refreshToken');
localStorage.removeItem('deviceId');

// Optionally call a logout endpoint to invalidate server-side session
// (if implemented)
```

---

## Common Error Codes

| Status Code | Error Type | Description |
|-------------|------------|-------------|
| 400 | ValidationError | Invalid request data or validation failed |
| 401 | UnauthorizedError | Invalid credentials or expired token |
| 404 | NotFoundError | User not found |
| 409 | ConflictError | Email already exists |
| 500 | InternalServerError | Server error |

---

## Data Models

### User Object

```typescript
interface User {
  id: string;              // UUID
  name: string;            // User's full name
  email: string;           // User's email
  avatarUrl: string | null; // URL to avatar image
  verified: boolean;       // Email verification status
  createdAt: string;       // ISO 8601 timestamp
  updatedAt: string;       // ISO 8601 timestamp
}
```

### Tokens Object

```typescript
interface AuthTokens {
  accessToken: string;     // JWT access token (short-lived)
  refreshToken: string;    // JWT refresh token (long-lived)
  deviceId: string;        // Device identifier for this session
}
```

### Auth Response

```typescript
interface AuthResponse {
  user: User;              // User object (without password)
  tokens: AuthTokens;      // Authentication tokens
}
```

---

## Environment Variables

The following environment variables affect authentication behavior:

- `JWT_SECRET`: Secret key for signing JWT tokens
- `ACCESS_TOKEN_TTL`: Access token expiration time (e.g., "1h", "3600")
- `REFRESH_TOKEN_TTL`: Refresh token expiration time (e.g., "7d", "604800")
- `APP_URL`: Base URL for email verification links

---

## Testing Examples

### Complete Authentication Test Suite

```javascript
// test-auth.js
const BASE_URL = 'http://localhost:3000';

async function testAuthFlow() {
  // 1. Register
  console.log('Testing registration...');
  const registerResponse = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test User',
      email: `test${Date.now()}@example.com`,
      password: 'TestPass123!',
      platform: 'web'
    })
  });
  
  const registerData = await registerResponse.json();
  console.log('✓ Registration successful:', registerData.user.email);
  
  const { accessToken, refreshToken, deviceId } = registerData.tokens;
  
  // 2. Test protected endpoint with access token
  console.log('\nTesting authenticated request...');
  const meResponse = await fetch(`${BASE_URL}/api/users/me`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  console.log('✓ Authenticated request successful');
  
  // 3. Refresh token
  console.log('\nTesting token refresh...');
  const refreshResponse = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken, deviceId })
  });
  
  const refreshData = await refreshResponse.json();
  console.log('✓ Token refresh successful');
  
  // 4. Login
  console.log('\nTesting login...');
  const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: registerData.user.email,
      password: 'TestPass123!',
      platform: 'web'
    })
  });
  
  const loginData = await loginResponse.json();
  console.log('✓ Login successful');
  
  console.log('\n✅ All authentication tests passed!');
}

testAuthFlow().catch(console.error);
```

---

## Support

For issues or questions, please contact the backend team or refer to the main API documentation.
