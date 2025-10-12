Perfect — let’s design a **proper, production-ready database schema** for your **Pulse** chat app.
We'll use **PostgreSQL** with **Prisma ORM**, keeping scalability, performance, and maintainability in mind.

---

# 🧩 Pulse — Database Schema Plan (PostgreSQL + Prisma)

## 🗂️ Overview

The database is designed to support:

* Secure user authentication
* Private and group chats
* Message persistence and attachments
* Live location sharing
* Efficient indexing for search and performance

---

## 🧠 Entity Relationship Diagram (Conceptual)

```
User ───< Message >─── User
  │                     │
  │                     │
  └──< GroupMember >─── Group
           │
           └──< Message >
```

---

## 🧱 Core Tables (Models)

### 1. **User**

Stores user credentials, profile info, and verification status.

```prisma
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
}
```

**Indexes:**

```prisma
@@index([email])
```

---

### 2. **Message**

Handles both private and group messages.
Supports text, media, and location sharing.

```prisma
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
}
```

**Enum:**

```prisma
enum MessageType {
  TEXT
  IMAGE
  VIDEO
  LOCATION
  FILE
}
```

**Indexes:**

```prisma
@@index([senderId])
@@index([receiverId])
@@index([groupId])
```

---

### 3. **Group**

Stores group-level metadata and relationships.

```prisma
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
```

---

### 4. **GroupMember**

Links users to groups with role-based access.

```prisma
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
```

**Enum:**

```prisma
enum GroupRole {
  ADMIN
  MEMBER
}
```

---

### 5. **VerificationToken**

Stores email verification and password reset tokens.

```prisma
model VerificationToken {
  id        String   @id @default(uuid())
  userId    String
  token     String   @unique
  type      TokenType
  createdAt DateTime @default(now())
  expiresAt DateTime

  user      User     @relation(fields: [userId], references: [id])
}

enum TokenType {
  EMAIL_VERIFICATION
  PASSWORD_RESET
}
```

---

### 6. **DeviceSession**

Tracks active user devices for better session control or notifications.

```prisma
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
```

---

### 7. **Media (Optional Enhancement)**

Useful if you want to track uploaded files separately for analytics or cleanup.

```prisma
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
```

---

## ⚙️ Schema Relationships Summary

| Entity                   | Relationship          | Notes                        |
| ------------------------ | --------------------- | ---------------------------- |
| User ↔ Message           | One-to-Many           | senderId and receiverId      |
| User ↔ GroupMember       | One-to-Many           | through GroupMember table    |
| Group ↔ Message          | One-to-Many           | all messages in a group      |
| Group ↔ GroupMember      | One-to-Many           | all members in a group       |
| User ↔ VerificationToken | One-to-Many           | email verification and reset |
| User ↔ DeviceSession     | One-to-Many           | multiple active sessions     |
| Message ↔ Media          | One-to-One (optional) | linked uploaded media        |

---

## 🧰 Example Migration Command

```bash
npx prisma migrate dev --name init_schema
```

---

## 🧠 Best Practices Applied

✅ **UUIDs** for primary keys (globally unique).
✅ **Enum types** for message and role control.
✅ **Indexed foreign keys** for faster lookups.
✅ **Soft joins** (receiverId/groupId) for flexible message context.
✅ **Token expiration** for secure verification.
✅ **Normalized schema** for clean relationships and future scalability.

---

## 🧾 Next Steps

1. Implement models in `prisma/schema.prisma`.
2. Run `npx prisma migrate dev`.
3. Generate Prisma client (`npx prisma generate`).
4. Implement repositories or service layers for CRUD operations.
5. Test data integrity via `npx prisma studio`.
