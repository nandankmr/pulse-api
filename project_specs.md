Below is a detailed, concrete, step-by-step project development plan for **Pulse** covering both **backend (Node.js)** and **frontend (React Native)**. Each step includes exact packages to use, commands, DB schema suggestions, APIs/events to implement, and testing/CI/ops considerations. Follow the steps in order; they’re grouped so you can parallelize backend & frontend work where it makes sense.

---

# High level architecture (recommended)

* **Frontend (Pulse mobile app)** — React Native (TypeScript) using `react-navigation`, `@reduxjs/toolkit`, `socket.io-client`, `react-query`/`@tanstack/react-query`, `nativewind` or `styled-components`.
* **Backend (Pulse API & realtime)** — Node.js + TypeScript, `express` for REST API, `socket.io` for realtime messaging, `Prisma` + PostgreSQL for data, `Redis` for presence/pub-sub and rate-limiting, S3-compatible object storage for attachments.
* **Auth** — JWT access tokens + refresh tokens, email verification via tokenized links.
* **Push Notifications** — Firebase Cloud Messaging (FCM).
* **Deployment** — Docker, run in Kubernetes or managed services (Heroku/GCP Cloud Run/AWS ECS), Redis & Postgres managed (Cloud provider or self-hosted).
* **Scaling** — socket.io Redis adapter, message persistence in Postgres, background job queue (BullMQ + Redis).

---

# Database schema (core tables)

Use **Postgres** + **Prisma** (recommended for TypeScript ergonomics).

Suggested tables (columns simplified):

* `users`
  `id` (uuid PK), `email` (unique), `password_hash`, `name`, `avatar_url`, `is_verified`, `created_at`, `updated_at`

* `email_verifications`
  `id`, `user_id`, `token`, `expires_at`, `used`

* `sessions`
  `id`, `user_id`, `refresh_token_hash`, `device_info`, `created_at`, `expires_at`

* `groups`
  `id`, `name`, `owner_id`, `is_private`, `created_at`, `avatar_url`

* `group_members`
  `id`, `group_id`, `user_id`, `role` (member/admin), `joined_at`

* `messages`
  `id`, `sender_id`, `chat_type` ('dm'|'group'), `chat_id` (recipient user id for dm or group id), `text`, `created_at`, `edited_at`, `deleted_at`

* `attachments`
  `id`, `message_id`, `url`, `type` (image/audio/location), `meta_json`

* `message_receipts`
  `id`, `message_id`, `user_id`, `status` ('delivered','read'), `timestamp`

* `presence` (optional ephemeral store in Redis)
  `user_id`, `socket_id`, `last_seen`, `status` ('online','idle','offline')

* `push_tokens`
  `id`, `user_id`, `platform`, `token`, `created_at`

* `invitations` (for group invites)
  `id`, `group_id`, `inviter_id`, `invitee_email`, `token`, `status`, `expires_at`

---

# Backend: Detailed step-by-step plan

## Foundation: project initialization & tooling

1. Initialize project:

```bash
mkdir pulse-backend && cd pulse-backend
yarn init -y
yarn add -D typescript ts-node-dev @types/node
npx tsc --init
```

2. Install core packages:

```bash
yarn add express cors helmet dotenv morgan
yarn add typescript reflect-metadata
```

3. TypeScript and linting:

```bash
yarn add -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier eslint-config-prettier eslint-plugin-import
```

4. Add development conveniences:

```bash
yarn add -D nodemon
```

---

## Data layer: Prisma + Postgres

1. Install Prisma:

```bash
yarn add prisma @prisma/client
yarn add -D prisma
npx prisma init
# set DATABASE_URL in .env
```

2. Create schema in `prisma/schema.prisma` reflecting tables above, then:

```bash
npx prisma migrate dev --name init
```

3. Recommended: enable connection pooling (pgBouncer or cloud provider) for production.

---

## Authentication & user management

1. Packages:

```bash
yarn add bcryptjs jsonwebtoken cookie-parser
```

2. Implement flows:

* **Register**: create user, hash password with `bcryptjs`, create `email_verifications` token, send verification email.
* **Email verification**: endpoint that consumes token and marks `is_verified`.
* **Login**: verify credentials, issue short-lived JWT access token + long-lived refresh token stored hashed in `sessions` table.
* **Refresh**: endpoint to rotate refresh tokens.
* **Logout**: revoke refresh token (delete session entry).

3. Token details:

* Access token: JWT (claims: user id, roles), expire short (e.g., 15–60m).
* Refresh token: opaque token stored hashed in DB with expire (e.g., 30d).

4. Email:

* Packages: `nodemailer` (or transactional email provider SDK like SendGrid / Mailgun).

```bash
yarn add nodemailer
```

* Use templated emails for verification and invite links.

---

## Validation & security

* Validation: `zod` or `joi` — I prefer **zod** for TypeScript ergonomics:

```bash
yarn add zod
```

* Security: `helmet`, `cors` (whitelist your mobile app origins if relevant), `rate-limiter-flexible` (API rate limiting), input sanitization.

```bash
yarn add rate-limiter-flexible
```

---

## Realtime messaging (Socket.IO)

1. Packages:

```bash
yarn add socket.io socket.io-redis @socket.io/redis-adapter
yarn add redis
```

2. Architecture:

* Run Socket.IO on same server or a separate realtime service.
* Use Redis adapter for multi-instance scaling (`createAdapter(redisClient, pubClient)`).
* On client connect: authenticate socket via access token, map `user_id` ↔ `socket_id` in Redis.
* Events to implement (examples):

  * `private:send_message` -> server persists message -> emits `private:new_message` to recipient socket(s) -> mark delivered if delivered.
  * `group:send_message` -> persist -> broadcast to group member sockets
  * `message:read` -> update receipts -> emit `message:read` event
  * `presence:update` -> broadcast presence changes
  * `typing:start` and `typing:stop`
  * `group:invite` -> handle invites via email or link

3. Use Redis pub/sub to notify other instances.

---

## Message persistence & ordering

* Write messages to Postgres (messages + attachments).
* Use created_at timestamps and `id` for ordering.
* Pagination: use cursor-based pagination (`created_at` + `id`).
* For delivery guarantees: server sends message and awaits ACK from client; if ACK received, mark delivered; otherwise mark pending and schedule retry or rely on pull by client on reconnect.

---

## Attachments (images, files, avatars)

* Storage options: AWS S3, DigitalOcean Spaces, or GCP storage.
* Use presigned URLs for uploads to S3 from client (avoid sending files through Node server).
* Packages: `@aws-sdk/client-s3` or `aws-sdk`.

```bash
yarn add @aws-sdk/client-s3
```

* For server-side processing (thumbnails), use background jobs (BullMQ) and image libraries (sharp).

---

## Background jobs & queues

* Use **BullMQ** (Redis) for email sending, attachment processing, push notifications.

```bash
yarn add bullmq
```

---

## Push Notifications (FCM)

* Use Firebase Admin SDK to send push notifications:

```bash
yarn add firebase-admin
```

* Save device tokens in `push_tokens`. Send push on new message when user offline.

---

## API surface (REST endpoints)

Design REST endpoints for account management, group management, message history (read-only), etc.

Examples:

**Auth**

* `POST /api/auth/register` — { email, name, password } -> create user, send verification
* `GET /api/auth/verify-email?token=...` — verify email
* `POST /api/auth/login` — { email, password } -> returns { accessToken, refreshToken }
* `POST /api/auth/refresh` — { refreshToken }
* `POST /api/auth/logout` — revokes refresh

**Users**

* `GET /api/users/:id`
* `PUT /api/users/me` — update profile (name, avatarUrl)
* `POST /api/users/me/avatar` — return S3 presigned URL or accept multipart

**Groups**

* `POST /api/groups` — create group
* `GET /api/groups/:id` — group info + members
* `POST /api/groups/:id/invite` — invite user/email
* `POST /api/groups/:id/join` — accept invite
* `PUT /api/groups/:id` — update group

**Messages (REST for history)**

* `GET /api/chats/:chatType/:chatId/messages?cursor=...&limit=...`
* `POST /api/chats/:chatType/:chatId/messages` — to support non-realtime sends (optional)

**Other**

* `POST /api/location/share` — store + optionally generate link
* `POST /api/push/register` — save device token

---

## Testing & docs

* Unit tests: `jest` + `ts-jest`.

```bash
yarn add -D jest ts-jest @types/jest supertest
```

* Integration: `supertest` against express endpoints.
* API docs: `swagger-jsdoc` + `swagger-ui-express` or `openapi`.

```bash
yarn add swagger-ui-express swagger-jsdoc
```

---

## Observability & logs

* Use `pino` or `winston` for structured logs:

```bash
yarn add pino pino-pretty
```

* Metrics: expose Prometheus metrics (prom-client) if needed.
* Error tracking: Sentry

```bash
yarn add @sentry/node
```

---

## Dev & production ops

* Dockerize the server; use `docker-compose` for local dev (Postgres, Redis).
* CI: GitHub Actions to run tests, lint, typechecks, migrations (prisma migrate), and build Docker images.
* Production: use managed Postgres & Redis; use load balancer; socket.io sticky sessions or use Redis adapter to support stateless sockets.

---

# Frontend (React Native): Detailed step-by-step plan

We assume your app name is `pulse` and you've already initialized the project per earlier instructions.

## Foundation: libraries & tooling (install these)

```bash
# core
yarn add @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
yarn add react-native-gesture-handler react-native-reanimated react-native-screens react-native-safe-area-context

# state & data
yarn add @reduxjs/toolkit react-redux redux-persist
yarn add @tanstack/react-query

# realtime
yarn add socket.io-client

# auth helpers
yarn add axios react-native-keychain

# UI & styling
yarn add nativewind  # or styled-components
yarn add react-native-vector-icons
yarn add react-native-safe-area-context

# media & location
yarn add react-native-image-picker react-native-fast-image
yarn add react-native-geolocation-service react-native-permissions react-native-maps

# storage & caching
yarn add @react-native-async-storage/async-storage

# push notifications
yarn add @react-native-firebase/app @react-native-firebase/messaging

# types
yarn add -D @types/socket.io-client
```

Run `npx pod-install ios` after native deps.

---

## App architecture & state

* Use **Redux Toolkit** for global auth/profile state, UI flags and offline queueing.
* Use **React Query** for server-synced queries (e.g., fetch group list, chat history).
* Use **socket.io-client** for realtime. Maintain a socket manager service that reconnects and re-auths using access token.
* Persist auth tokens & small caches with `redux-persist` and `AsyncStorage`.

---

## Screens & components (suggested)

Create the following high-level screens/components (file structure under `src/screens` and `src/components`):

**Auth**

* `RegisterScreen` — fields: name, email, password, accept T&Cs.
* `VerifyEmailScreen` — show waiting & confirm resend.
* `LoginScreen` — login form, forgot password.

**Main**

* `DashboardScreen` — recent chats (DMs + groups), search
* `ChatScreen` — message list, input, attachment button, typing indicator, group header
* `CreateGroupScreen` — name, add members, avatar
* `GroupInfoScreen` — members list, invite links, leave group
* `ProfileScreen` — update name, avatar, status

**Shared components**

* `MessageBubble`, `MessageList` (FlatList with inverted scrolling and pagination), `MessageInput`, `TypingIndicator`, `AttachmentPicker`, `Avatar`, `Header`, `SearchBar`.

---

## Realtime client behavior

* On app start / after login: connect socket and authenticate: `socket.auth = { token: accessToken }` then `socket.connect()`.
* Maintain presence: send `presence:update` on foreground/background changes, and handle `visibilitychange`.
* Message flow:

  * User taps send -> optimistically push message to UI (local id + pending flag) -> emit `private:send_message` or `group:send_message` with payload -> server responds with persisted message id -> update local message to persisted state; on failure mark as failed.
* On socket reconnect: fetch missed messages using REST `GET /messages` with last known cursor.

---

## Message list details

* Use `FlatList` inverted for chat.
* Pagination by `cursor` — call `queryClient.fetch` to load older messages when user scrolls up.
* Use `react-native-fast-image` for performant image handling.

---

## Attachments upload flow

* Get presigned upload URL from backend: `POST /api/uploads/presign` with file metadata -> backend returns URL -> upload file from RN (fetch/axios) -> send message with attachment URL to backend via socket or REST.

---

## Location sharing

* Use `react-native-geolocation-service` + permissions flow (`react-native-permissions`).
* Share as message with `attachments.type = 'location'` and `meta = { lat, lng, accuracy }`.
* Render on `ChatScreen` with a small map preview (link to `react-native-maps` screen).

---

## Group invites

* Invite by email: backend creates invite token and sends invite email with accept link.
* Invite by link: backend provides token-based URL; client can open link to accept (deep link) or join via UI.

Packages for deep linking:

```bash
yarn add @react-navigation/native @react-navigation/native-stack
# configure linking with scheme in AndroidManifest and iOS Info.plist
```

---

## Push notifications

* Use `@react-native-firebase/messaging` to register token and send to backend.
* Handle background and terminated states — clicking notification should navigate into the relevant chat screen (deep linking / navigation params).

---

## Local persistence & offline handling

* Persist messages locally for each chat (small cache) and sync with server on reconnect.
* Use optimistic UI for sends; if failed, retry mechanism and offer manual retry.
* Use `redux-persist` for auth & basic app state.

---

## Error handling & retries

* Network errors: show inline error to user and queue retry.
* Message ACK timeouts: mark unsent and retry.
* Background sync worker (JS or native) could reconcile missed messages (optional advanced).

---

## Testing (frontend)

* Unit tests: `jest` + `react-native-testing-library`.
* E2E: `detox` or `Appium` for device-level tests (recommended for critical flows like auth & messaging).

---

## CI & Deployment

* CI (GitHub Actions) for building, running unit tests, typecheck, and `pod install` on iOS.
* Automate TestFlight and Play Store builds via `fastlane` or dedicated CI/CD pipelines.
* Use Sentry for crash reporting: `@sentry/react-native`.

---

# Security & privacy checklist

* Enforce TLS for all API and socket connections.
* Hash refresh tokens in DB; rotate tokens on refresh.
* Rate-limit sensitive endpoints (login, register, invite).
* Validate file types and sizes on presigned upload (backend).
* Secure storage of tokens on device: use `react-native-keychain`.
* Data retention & GDPR: provide ways to delete a user and all associated messages (soft delete or permanent wipe depending on policy).
* Use content moderation / virus scan for uploaded files if needed.

---

# Monitoring & observability

* Backend: structured logs (pino), metrics (prom-client), errors (Sentry).
* Frontend: crash logs + performance traces (Sentry), analytics events for critical flows (login, message send failure, message delivery).

---

# Suggested order of execution (concrete steps you can follow)

Do these in sequence; several items can be done in parallel by different devs.

**Phase A — Backend core**

1. Init repo, TypeScript, Prisma schema, Postgres setup (local via docker-compose).
2. Implement auth (register, verify email, login, refresh, logout). Implement nodemailer/sendgrid integration.
3. Implement user profile endpoints (get/update avatar with presigned upload).
4. Implement Groups & membership endpoints.
5. Implement messages persistence endpoints (history).
6. Implement socket.io server with auth middleware, message send/receive events, and Redis adapter.
7. Add file uploads presign + BullMQ jobs for processing (optional).
8. Add push notification integration (FCM) and registration endpoint.
9. Add tests (unit + integration) and Swagger docs.
10. Dockerize backend; create docker-compose for local dev (Postgres, Redis). Add CI workflow.

**Phase B — Frontend core**

1. Init `pulse` RN app (you already have), setup navigation & basic auth screens.
2. Implement register/login flows with API integration. Implement email verification UI.
3. Add Redux Toolkit store + react-query setup; persist auth state.
4. Implement Dashboard with recent chats (mock data then connect to API).
5. Implement socket manager and connect on login. Implement optimistic send (Private chat first).
6. Implement ChatScreen with message list, attachments, and read receipts.
7. Implement Group create/join/invite flows.
8. Implement location sharing flow & map preview.
9. Add push notifications handling and deep linking to open specific chats.
10. Add tests (unit & integration) and CI to build & run tests.

**Phase C — Hardening & production**

1. Stress test socket flows and scale with Redis adapter.
2. Add monitoring & alerts.
3. Security audit, pen test critical APIs.
4. Setup production CI/CD, backups for DB, log retention, and autoscaling rules.

---

# Deliverables & artifacts to produce along the way

* Postgres + Prisma schema and migration files.
* OpenAPI (Swagger) spec for REST API.
* Socket event spec (document names, payload shapes, expected server responses).
* Postman/Insomnia collection for REST endpoints and sample messages.
* Dockerfiles + docker-compose for local dev.
* CI workflow YAML (GitHub Actions).
* README with dev onboarding steps (how to run backend + frontend locally).
* E2E test scripts (detox) and unit tests coverage.

---

# Quick reference: recommended libraries (summary)

**Backend**

* Framework & utils: `express`, `cors`, `helmet`, `dotenv`, `morgan`
* DB & ORM: `postgres`, `prisma`, `@prisma/client`
* Auth & crypto: `bcryptjs`, `jsonwebtoken`, `cookie-parser`
* Validation: `zod`
* Realtime: `socket.io`, `@socket.io/redis-adapter`, `redis`
* Queue: `bullmq`
* Email: `nodemailer` or SendGrid SDK
* Storage: `@aws-sdk/client-s3`
* Push: `firebase-admin`
* Testing & docs: `jest`, `supertest`, `swagger-ui-express`
* Logging & monitoring: `pino`, `@sentry/node`

**Frontend**

* Core: `react-native` (TypeScript), `react-navigation`
* State & queries: `@reduxjs/toolkit`, `react-redux`, `@tanstack/react-query`, `redux-persist`
* Realtime: `socket.io-client`
* Styling: `nativewind` or `styled-components`, `react-native-vector-icons`
* Images & media: `react-native-image-picker`, `react-native-fast-image`
* Location: `react-native-geolocation-service`, `react-native-maps`, `react-native-permissions`
* Push: `@react-native-firebase/messaging`
* Secure storage: `react-native-keychain`
* Testing: `jest`, `@testing-library/react-native`, E2E: `detox`
