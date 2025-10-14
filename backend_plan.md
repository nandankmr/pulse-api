# Pulse Backend Project Plan

Based on the detailed requirements in `project_specs.md`, this plan outlines the backend development steps for the Node.js/TypeScript API. Each step focuses on backend implementation, with comments for the frontend team on what APIs or features need to be available for the frontend to work properly.

Since we already have the basic project scaffolded with Prisma, TypeScript, and some initial setup, we'll continue from there.

## Phase 1: Project Foundation & Tooling

### Step 1.1: Initialize Project Structure
- Set up the basic project structure with proper folder organization (`src/modules`, `src/shared`, `src/config`)
- Ensure TypeScript configuration is properly set up
- Add ESLint and Prettier configurations

**Frontend requirement**: None - this is foundational setup

### Step 1.2: Install Core Dependencies
- Install Express, CORS, Helmet, dotenv, morgan for the web framework
- Add validation with zod
- Set up development tools (nodemon, ts-node-dev)

```bash
npm install express cors helmet dotenv morgan zod
npm install -D nodemon ts-node-dev @types/node typescript
```

**Frontend requirement**: None

### Step 1.3: Set Up Database Schema

Complete the Prisma schema with a production-ready design that supports:
- Secure user authentication
- Private and group chats
- Message persistence and attachments
- Live location sharing
- Efficient indexing for search and performance

**Database Design Overview:**

The database uses PostgreSQL with Prisma ORM and follows these design principles:
- **UUID primary keys** for global uniqueness
- **Enum types** for message and role control
- **Indexed foreign keys** for faster lookups
- **Soft joins** (receiverId/groupId) for flexible message context
- **Token expiration** for secure verification
- **Normalized schema** for clean relationships and scalability

**Core Models:**

```prisma
// User Model - Stores user credentials, profile info, and verification status
model User {
  id             String     @id @default(uuid())
  name           String
  email          String     @unique
  password       String
  avatarUrl      String?
  verified       Boolean    @default(false)
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt
  messagesSent   Message[]  @relation("SentMessages")
  messagesReceived Message[] @relation("ReceivedMessages")
  groupMemberships GroupMember[]
  verificationTokens VerificationToken[]
  deviceSessions DeviceSession[]
}

// Message Model - Handles both private and group messages with media/location support
model Message {
  id          String   @id @default(uuid())
  senderId    String
  receiverId  String?   // For 1-1 chats
  groupId     String?   // For group chats
  type        MessageType @default(TEXT)
  content     String?
  mediaUrl    String?   // S3 / OCI media URL
  location    Json?     // { latitude, longitude }
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  sender      User      @relation("SentMessages", fields: [senderId], references: [id])
  receiver    User?     @relation("ReceivedMessages", fields: [receiverId], references: [id])
  group       Group?    @relation(fields: [groupId], references: [id])
  media       Media?    @relation(fields: [id], references: [messageId])
}

// Group Model - Stores group-level metadata and relationships
model Group {
  id          String        @id @default(uuid())
  name        String
  description String?
  avatarUrl   String?
  createdBy   String
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  members     GroupMember[]
  messages    Message[]
}

// GroupMember Model - Links users to groups with role-based access
model GroupMember {
  id        String   @id @default(uuid())
  groupId   String
  userId    String
  role      GroupRole @default(MEMBER)
  joinedAt  DateTime @default(now())

  group     Group   @relation(fields: [groupId], references: [id])
  user      User    @relation(fields: [userId], references: [id])

  @@unique([groupId, userId]) // Prevent duplicate memberships
}

// VerificationToken Model - Stores email verification and password reset tokens
model VerificationToken {
  id        String   @id @default(uuid())
  userId    String
  token     String   @unique
  type      TokenType
  createdAt DateTime @default(now())
  expiresAt DateTime

  user      User     @relation(fields: [userId], references: [id])
}

// DeviceSession Model - Tracks active user devices for session control
model DeviceSession {
  id        String   @id @default(uuid())
  userId    String
  deviceId  String
  platform  String
  lastActive DateTime @default(now())
  token     String?

  user      User @relation(fields: [userId], references: [id])

  @@index([userId])
}

// Media Model (Optional) - Track uploaded files separately for analytics
model Media {
  id         String   @id @default(uuid())
  uploaderId String
  url        String
  type       String
  size       Int?
  messageId  String?

  uploader   User     @relation(fields: [uploaderId], references: [id])
  message    Message? @relation(fields: [messageId], references: [id])

  createdAt  DateTime @default(now())
}

// Enums for type safety
enum MessageType {
  TEXT
  IMAGE
  VIDEO
  LOCATION
  FILE
}

enum GroupRole {
  ADMIN
  MEMBER
}

enum TokenType {
  EMAIL_VERIFICATION
  PASSWORD_RESET
}
```

**Database Indexes:**

```prisma
// User indexes
@@index([email])

// Message indexes for performance
@@index([senderId])
@@index([receiverId])
@@index([groupId])
```

**Entity Relationships:**

| Entity                   | Relationship          | Notes                        |
| ------------------------ | --------------------- | ---------------------------- |
| User ↔ Message           | One-to-Many           | senderId and receiverId      |
| User ↔ GroupMember       | One-to-Many           | through GroupMember table    |
| Group ↔ Message          | One-to-Many           | all messages in a group      |
| Group ↔ GroupMember      | One-to-Many           | all members in a group       |
| User ↔ VerificationToken | One-to-Many           | email verification and reset |
| User ↔ DeviceSession     | One-to-Many           | multiple active sessions     |
| Message ↔ Media          | One-to-One (optional) | linked uploaded media        |

**Implementation Steps:**

```bash
# Generate initial migration with the complete schema
npx prisma migrate dev --name init_schema

# Generate Prisma client
npx prisma generate

# Verify schema with Prisma Studio (for development)
npx prisma studio
```

**Frontend requirement**: Database structure for user registration and authentication

## Phase 2: Authentication & User Management

### Step 2.1: Implement Authentication System
- Create auth module with register, login, refresh token functionality
- Implement JWT access tokens and refresh tokens
- Add password hashing with bcryptjs
- Create email verification system

```bash
npm install bcryptjs jsonwebtoken cookie-parser nodemailer @types/bcryptjs @types/jsonwebtoken @types/cookie-parser
```

**Frontend requirement**: POST /api/auth/register, POST /api/auth/login, POST /api/auth/refresh endpoints

### Step 2.2: Implement Email Verification (OTP-Based)
- Create OTP email verification service
- Add OTP generation, storage, validation, and expiry handling
- Set up email templates and delivery using SMTP

**Frontend requirement**: POST /api/auth/verify-email endpoint for OTP submission

### Step 2.3: Implement User Profile Management
- Create user service for profile updates
- Add avatar upload functionality with presigned URLs
- Implement user search and profile retrieval

**Frontend requirement**: GET /api/users/:id, PUT /api/users/me, POST /api/users/me/avatar endpoints

## Phase 3: Groups & Membership Management

### Step 3.1: Implement Group Creation
- Create groups module with CRUD operations
- Add group membership management
- Implement group roles (member/admin)

**Frontend requirement**: POST /api/groups, GET /api/groups/:id endpoints

### Step 3.2: Implement Group Invitations
- Add invitation system with tokens
- Create invite link generation
- Implement join group functionality

**Frontend requirement**: POST /api/groups/:id/invite, POST /api/groups/:id/join endpoints

## Phase 4: Messaging System

### Step 4.1: Implement Message Persistence
- Create messages module with CRUD operations
- Add message history and pagination
- Implement soft delete for messages

**Frontend requirement**: GET /api/chats/:chatType/:chatId/messages endpoint

### Step 4.2: Implement Real-time Messaging (Socket.IO)
- Set up Socket.IO server with authentication middleware
- Implement message events (send, receive, read receipts)
- Add presence tracking and typing indicators

```bash
npm install socket.io @socket.io/redis-adapter redis
```

**Frontend requirement**: Socket.IO server with message events and authentication

### Step 4.3: Implement Message Receipts
- Add message delivery and read status tracking
- Create message receipt service
- Update message status via Socket.IO events

**Frontend requirement**: Socket events for message:read and delivery status

## Phase 5: File Attachments & Media

### Step 5.1: Implement File Upload System
- Set up AWS S3 integration for file storage
- Create presigned URL generation for uploads
- Add file type and size validation

```bash
npm install @aws-sdk/client-s3
```

**Frontend requirement**: POST /api/uploads/presign endpoint for presigned URLs

### Step 5.2: Implement Attachment Processing
- Add background job processing for image thumbnails
- Create attachment metadata extraction
- Set up file cleanup for deleted messages

```bash
npm install bullmq sharp
```

**Frontend requirement**: Attachment processing and thumbnail generation

## Phase 6: Push Notifications

### Step 6.1: Implement FCM Integration
- Set up Firebase Cloud Messaging
- Create push notification service
- Add device token management

```bash
npm install firebase-admin
```

**Frontend requirement**: FCM server setup for sending push notifications

### Step 6.2: Implement Push Token Management
- Add push token registration endpoint
- Create notification sending logic for offline users

**Frontend requirement**: POST /api/push/register endpoint

## Phase 7: API Documentation & Testing

### Step 7.1: Implement API Documentation
- Set up Swagger/OpenAPI documentation
- Add request/response schemas
- Create API documentation endpoints

```bash
npm install swagger-ui-express swagger-jsdoc
```

**Frontend requirement**: None - internal documentation

### Step 7.2: Implement Testing Suite
- Add unit tests for services and utilities
- Create integration tests for API endpoints
- Set up test database and fixtures

```bash
npm install -D jest ts-jest @types/jest supertest @types/supertest
```

**Frontend requirement**: None - internal testing

## Phase 8: Security & Performance

### Step 8.1: Implement Security Middleware
- Add rate limiting for sensitive endpoints
- Implement input sanitization and validation
- Set up CORS properly for frontend integration

```bash
npm install rate-limiter-flexible
```

**Frontend requirement**: Proper CORS configuration for React Native app

### Step 8.2: Implement Logging & Monitoring
- Set up structured logging with pino
- Add error tracking with Sentry
- Create health check endpoints

```bash
npm install pino pino-pretty @sentry/node
```

**Frontend requirement**: None - internal monitoring

## Phase 9: Deployment & Production Setup

### Step 9.1: Dockerize Application
- Create Dockerfile for the application
- Set up docker-compose for local development
- Add production Docker configuration

**Frontend requirement**: None - deployment setup

### Step 9.2: Set Up CI/CD Pipeline
- Create GitHub Actions workflow
- Add automated testing and deployment
- Set up environment configurations

**Frontend requirement**: None - deployment pipeline

### Step 9.3: Production Configuration
- Set up environment variables for production
- Configure Redis for Socket.IO scaling
- Add database connection pooling

**Frontend requirement**: Stable API endpoints for production use

## Key Integration Points with Frontend

Throughout the development process, ensure these backend features are ready before corresponding frontend work:

1. **Authentication APIs** - Before frontend auth screens
2. **Socket.IO server** - Before implementing real-time messaging
3. **File upload endpoints** - Before attachment features
4. **Push notification setup** - Before notification integration
5. **Group management APIs** - Before group creation screens

## Deliverables

- Complete Prisma schema with all required models
- REST API with full CRUD operations for all entities
- Socket.IO server with real-time messaging
- File upload system with S3 integration
- Push notification service with FCM
- Comprehensive test suite
- API documentation
- Docker configuration for deployment

This plan can be executed step by step. Start with Phase 1 and proceed sequentially, ensuring each phase is completed before moving to the next. The frontend team can start working on authentication flows once Phase 2 is complete.
