# Pulse API Endpoints

This document lists the REST endpoints currently implemented in the backend to support the frontend work outlined in `frontend_plan.md`.

## Authentication

### POST `/api/auth/register`
- **Description**: Register a new user and returns access/refresh tokens.
- **Request Body** (`application/json`):
  ```json
  {
    "name": "string",
    "email": "string",
    "password": "string",
    "deviceId": "string optional",
    "deviceName": "string optional",
    "platform": "string optional"
  }
  ```
- **Responses**:
  - `201 Created`
    ```json
    {
      "user": {
        "id": "uuid",
        "name": "string",
        "email": "string",
        "avatarUrl": null,
        "verified": false,
        "createdAt": "ISO date",
        "updatedAt": "ISO date"
      },
      "tokens": {
        "accessToken": "jwt",
        "refreshToken": "jwt",
        "deviceId": "string"
      }
    }
    ```
  - `400 Bad Request`: Validation errors.
  - `409 Conflict`: Email already in use.

### POST `/api/auth/login`
- **Description**: Authenticate an existing user and issue new tokens.
- **Request Body** (`application/json`):
  ```json
  {
    "email": "string",
    "password": "string",
    "deviceId": "string optional",
    "deviceName": "string optional",
    "platform": "string optional"
  }
  ```
- **Responses**:
  - `200 OK` with same response shape as registration.
  - `400 Bad Request`: Validation errors.
  - `401 Unauthorized`: Invalid credentials.

### POST `/api/auth/refresh`
- **Description**: Refresh access token using a valid refresh token and device context.
- **Request Body** (`application/json`):
  ```json
  {
    "refreshToken": "string",
    "deviceId": "string optional"
  }
  ```
  - `200 OK` with user and refreshed tokens.
  - `400 Bad Request`: Validation errors.
  - `401 Unauthorized`: Invalid or expired refresh token/session.

### POST `/api/auth/verify-email`
- **Description**: Verify a user's email using a one-time passcode (OTP).
- **Request Body** (`application/json`):
  ```json
  {
    "email": "string",
    "otp": "6 digit string"
  }
  ```
- **Responses**:
  - `200 OK`
    ```json
    {
      "user": {
        "id": "uuid",
        "name": "string",
        "email": "string",
        "avatarUrl": null,
        "verified": true,
        "createdAt": "ISO date",
        "updatedAt": "ISO date"
      }
    }
    ```
  - `400 Bad Request`: Invalid or expired OTP.
  - `404 Not Found`: Email not associated with a user account.
- **Notes**:
  - OTPs expire after 10 minutes; initiate a new registration flow to resend a code.

## Users

### POST `/users`
- **Description**: Create a new user.
- **Request Body** (`application/json`):
  ```json
  {
    "name": "string",
    "email": "string",
    "password": "string"
  }
  ```
- **Description**: Retrieve paginated list of users.
- **Query Parameters**:
  - `page` *(number, optional)*: Page number (default 1).
  - `limit` *(number, optional)*: Items per page (default 10, max 100).
- **Responses**:
  - `200 OK`
    ```json
    {
      "data": [
        {
          "id": "uuid",
          "name": "string",
          "email": "string",
          "avatarUrl": "string | null",
          "verified": true,
          "createdAt": "ISO date",
          "updatedAt": "ISO date"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 10,
        "total": 100,
        "totalPages": 10,
        "hasNext": true,
        "hasPrev": false
      }
    }
    ```
  - Possible errors: validation or server errors handled via global error handler (`error.middleware.ts`).

### GET `/users/:id`
- **Description**: Retrieve a single user by ID.
- **Path Parameters**:
  - `id` *(string, required)*: User UUID.
- **Responses**:
  - `200 OK`
    ```json
    {
      "id": "uuid",
      "name": "string",
      "email": "string",
      "avatarUrl": "string | null",
      "verified": true,
      "createdAt": "ISO date",
      "updatedAt": "ISO date"
    }
    ```
  - `404 Not Found`: When user ID is invalid or not found.

### GET `/users/search`
- **Description**: Search users by name or email (case-insensitive).
- **Query Parameters**:
  - `q` *(string, required)*: Search term (partial match).
  - `limit` *(number, optional)*: Maximum items to return (default 20).
- **Responses**:
  - `200 OK`
    ```json
    {
      "data": [
        {
          "id": "uuid",
          "name": "string",
          "email": "string",
          "avatarUrl": "string | null",
          "verified": true
        }
      ]
    }
    ```
  - `400 Bad Request`: Missing search query.

### PUT `/users/me`
- **Description**: Update authenticated user's profile details.
- **Authentication**: Requires `Authorization: Bearer <access_token>` header.
- **Request Body** (`application/json`):
  ```json
  {
    "name": "string optional",
    "password": "string optional"
  }
  ```
- **Responses**:
  - `200 OK`: Returns updated user.
  - `400 Bad Request`: Missing fields to update.
  - `401 Unauthorized`: User not authenticated.

### POST `/users/me/avatar`
- **Description**: Upload or replace the authenticated user's avatar image.
- **Authentication**: Requires `Authorization: Bearer <access_token>` header.
- **Request**: `multipart/form-data` with file field `avatar`.
- **Constraints**:
  - Only image MIME types permitted.
  - Maximum file size 5 MB.
- **Responses**:
  - `200 OK`: Returns updated user with new `avatarUrl`.
  - `400 Bad Request`: Missing file or invalid MIME type.
  - `401 Unauthorized`: User not authenticated.

### POST `/users`
- **Description**: Create a new user.
- **Request Body** (`application/json`):
  ```json
  {
    "name": "string",
    "email": "string",
    "password": "string"
  }
  ```
- **Responses**:
  - `201 Created`
    ```json
    {
      "id": "uuid",

### DELETE `/groups/{groupId}/members/{userId}`
- **Description**: Remove a member (admins can remove others; members may leave themselves).
- **Authentication**: Requires `Authorization: Bearer <access_token>` header.
- **Responses**:
  - `200 OK`: Returns updated group roster.
  - `400 Bad Request`: Attempted to remove final admin.
  - `401 Unauthorized`: Requester lacks permission.
  - `404 Not Found`: Group or member missing.

### POST `/groups/{groupId}/invite`
- **Description**: Generate an invitation token for the group (admin only).
- **Authentication**: Requires `Authorization: Bearer <access_token>` header.
- **Request Body** (`application/json`, optional):
  ```json
  {
    "email": "invitee@example.com optional",
    "expiresInHours": 72
  }
  ```
- **Responses**:
  - `201 Created`: Returns invitation details including `token` and expiry.
  - `400 Bad Request`: Validation failure (e.g., invalid expiry duration).
  - `401 Unauthorized`: Requester not an admin or unauthenticated.
  - `404 Not Found`: Group not found.

### POST `/groups/{groupId}/join`
- **Description**: Join a group using an invitation token.
- **Authentication**: Requires `Authorization: Bearer <access_token>` header.
- **Request Body** (`application/json`):
  ```json
  {
    "token": "string"
  }
  ```
- **Responses**:
  - `200 OK`: Returns updated group roster including the new member.
  - `400 Bad Request`: Invalid/expired token or mismatched group.
  - `401 Unauthorized`: Token restricted to a different email or missing auth.
  - `404 Not Found`: Invitation or group not found.

## Error Handling
