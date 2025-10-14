# Environment Configuration Guide

## Required .env Configuration

Here's a complete guide to configure your `.env` file for smooth operation, especially for Android development.

## Quick Start - Minimal Configuration

For local development with Android emulator, you need these **essential** variables:

```bash
# .env (Minimal for Android Development)

# Server
NODE_ENV=development
PORT=3000

# Database (REQUIRED - Update with your actual database URL)
DATABASE_URL="postgresql://avnadmin:YOUR_PASSWORD@pg-3ce20371-ecommerce-start.b.aivencloud.com:15669/defaultdb?sslmode=require"

# JWT Secret (REQUIRED - Must be at least 32 characters)
JWT_SECRET="your-super-secret-jwt-key-change-this-to-something-secure-at-least-32-chars"

# Email (For development, use MailHog or similar)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=
MAIL_FROM="no-reply@pulse-api.com"

# App URL (for email links)
APP_URL=http://localhost:3000

# Storage
USER_AVATAR_STORAGE_PATH="./storage/avatars"

# Socket.IO CORS (for Android Emulator)
SOCKET_CORS_ORIGINS=http://10.0.2.2:3000,http://10.0.2.2:8081,http://localhost:3000,http://localhost:8081
```

---

## Complete Configuration Reference

### 1. Server Configuration

```bash
# Environment: development | production | test
NODE_ENV=development

# Port the server will run on
PORT=3000
```

**Notes:**
- `NODE_ENV=development` enables detailed error messages and logging
- Server will listen on `0.0.0.0:3000` (accessible from Android emulator)

---

### 2. Database Configuration ⚠️ CRITICAL

```bash
# PostgreSQL connection string
DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"
```

**Your Current Database:**
Based on your schema, you're using Aiven PostgreSQL:
```bash
DATABASE_URL="postgresql://avnadmin:YOUR_PASSWORD@pg-3ce20371-ecommerce-start.b.aivencloud.com:15669/defaultdb?sslmode=require"
```

**Important:**
- ✅ Must start with `postgres://` or `postgresql://`
- ✅ Include `?sslmode=require` for secure connections
- ⚠️ Never commit this to Git (it's in `.gitignore`)

**To verify your database connection:**
```bash
npx prisma db pull
```

---

### 3. JWT Configuration ⚠️ CRITICAL

```bash
# Secret key for signing JWT tokens (MUST be at least 32 characters)
JWT_SECRET="your-super-secret-jwt-key-at-least-32-characters-long-change-this"

# Access token expiration (e.g., 15m, 1h, 24h, 7d)
JWT_EXPIRES_IN=24h

# Refresh token expiration
JWT_REFRESH_EXPIRES_IN=7d
```

**Generate a secure JWT secret:**
```bash
# Option 1: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2: Using OpenSSL
openssl rand -hex 32

# Option 3: Using online generator
# Visit: https://generate-secret.vercel.app/32
```

**Important:**
- ⚠️ Must be at least 32 characters
- ⚠️ Use different secrets for development and production
- ⚠️ Never share or commit this secret

---

### 4. Email Configuration (For OTP & Notifications)

```bash
# SMTP Server
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=
MAIL_FROM="no-reply@pulse-api.com"
```

**Development Options:**

#### Option A: MailHog (Recommended for Development)
```bash
# Install MailHog
brew install mailhog

# Run MailHog
mailhog

# Configuration
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=
MAIL_FROM="no-reply@pulse-api.com"

# View emails at: http://localhost:8025
```

#### Option B: Gmail SMTP
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
MAIL_FROM="your-email@gmail.com"
```

**Note:** For Gmail, you need to generate an [App Password](https://myaccount.google.com/apppasswords)

#### Option C: SendGrid
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
MAIL_FROM="verified-sender@yourdomain.com"
```

---

### 5. Storage Configuration

```bash
# Path for storing user avatars
USER_AVATAR_STORAGE_PATH="./storage/avatars"
```

**Notes:**
- Path is relative to project root
- Directory will be created automatically
- For production, consider using cloud storage (S3, GCS, etc.)

---

### 6. Socket.IO Configuration (For Real-time Features)

```bash
# Allowed CORS origins for Socket.IO (comma-separated)
SOCKET_CORS_ORIGINS=http://10.0.2.2:3000,http://10.0.2.2:8081,http://localhost:3000,http://localhost:8081

# Optional: Redis for horizontal scaling (multiple server instances)
# SOCKET_REDIS_URL=redis://localhost:6379
```

**For Android Development:**
```bash
# Must include Android emulator IPs
SOCKET_CORS_ORIGINS=http://10.0.2.2:3000,http://10.0.2.2:8081,http://localhost:3000,http://localhost:8081
```

**For Production:**
```bash
# Restrict to your actual frontend domains
SOCKET_CORS_ORIGINS=https://your-app.com,https://www.your-app.com
```

---

### 7. Application URL

```bash
# Base URL for your application (used in emails, links, etc.)
APP_URL=http://localhost:3000
```

**For Android Emulator:**
```bash
# Use this if sending emails with links that should work from emulator
APP_URL=http://10.0.2.2:3000
```

---

### 8. Logging Configuration

```bash
# Log level: error | warn | info | debug
LOG_LEVEL=info
```

**Recommended:**
- Development: `debug` or `info`
- Production: `warn` or `error`

---

### 9. API Configuration

```bash
# API version
API_VERSION=v1

# API prefix (all routes will be under this)
API_PREFIX=/api

# Cache TTL in seconds
CACHE_TTL=300
```

---

## Complete .env Template for Android Development

Create a `.env` file in your project root with this content:

```bash
# ============================================
# PULSE API - Environment Configuration
# ============================================

# --------------------------------------------
# Server Configuration
# --------------------------------------------
NODE_ENV=development
PORT=3000

# --------------------------------------------
# Database Configuration (REQUIRED)
# --------------------------------------------
# Update with your actual database credentials
DATABASE_URL="postgresql://avnadmin:YOUR_PASSWORD_HERE@pg-3ce20371-ecommerce-start.b.aivencloud.com:15669/defaultdb?sslmode=require"

# --------------------------------------------
# JWT Configuration (REQUIRED)
# --------------------------------------------
# Generate a secure secret: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET="REPLACE_WITH_YOUR_GENERATED_SECRET_AT_LEAST_32_CHARACTERS"
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# --------------------------------------------
# Email Configuration
# --------------------------------------------
# For development, use MailHog (brew install mailhog)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=
MAIL_FROM="no-reply@pulse-api.com"

# --------------------------------------------
# Application URL
# --------------------------------------------
APP_URL=http://localhost:3000

# --------------------------------------------
# Storage Configuration
# --------------------------------------------
USER_AVATAR_STORAGE_PATH="./storage/avatars"

# --------------------------------------------
# Socket.IO Configuration (For Android)
# --------------------------------------------
# Includes Android emulator IPs (10.0.2.2)
SOCKET_CORS_ORIGINS=http://10.0.2.2:3000,http://10.0.2.2:8081,http://localhost:3000,http://localhost:8081,http://localhost:3001

# --------------------------------------------
# Optional: Redis for Socket.IO Scaling
# --------------------------------------------
# SOCKET_REDIS_URL=redis://localhost:6379

# --------------------------------------------
# Logging
# --------------------------------------------
LOG_LEVEL=info

# --------------------------------------------
# API Configuration
# --------------------------------------------
API_VERSION=v1
API_PREFIX=/api
CACHE_TTL=300

# --------------------------------------------
# Optional: Monitoring (Production)
# --------------------------------------------
# SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
# NEW_RELIC_LICENSE_KEY=your-new-relic-license-key
```

---

## Setup Checklist

Before running the server, ensure:

- [ ] `.env` file created in project root
- [ ] `DATABASE_URL` updated with your actual database credentials
- [ ] `JWT_SECRET` generated and set (at least 32 characters)
- [ ] `SOCKET_CORS_ORIGINS` includes `http://10.0.2.2:3000` for Android
- [ ] Email service configured (MailHog for development)
- [ ] Storage directory exists or will be auto-created

---

## Verification Steps

### 1. Check Environment Variables
```bash
# Verify .env is loaded
node -e "require('dotenv').config(); console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Not set'); console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ Not set');"
```

### 2. Test Database Connection
```bash
# Pull database schema
npx prisma db pull

# Generate Prisma client
npx prisma generate

# Check database status
npx prisma db push
```

### 3. Start the Server
```bash
npm run dev
```

You should see:
```
🚀 Server running on port 3000
📚 API Documentation: http://localhost:3000/api-docs
🔌 Socket.IO ready on /socket.io
📱 Android Emulator: Use http://10.0.2.2:3000
📱 Physical Device: Use http://<your-local-ip>:3000
```

### 4. Test from Android Emulator
```bash
# From your Android app, make a request to:
http://10.0.2.2:3000/api-docs
```

---

## Common Issues & Solutions

### Issue: "JWT_SECRET must be at least 32 characters long"
**Solution:** Generate a proper secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Issue: "DATABASE_URL must be a valid... connection string"
**Solution:** Ensure URL starts with `postgres://` or `postgresql://`
```bash
# Correct format
DATABASE_URL="postgresql://user:pass@host:port/db?sslmode=require"
```

### Issue: "Cannot connect to database"
**Solutions:**
1. Check database credentials
2. Verify network connectivity
3. Ensure SSL mode is correct
4. Test connection: `npx prisma db pull`

### Issue: "CORS error from Android app"
**Solution:** Add Android emulator IP to CORS origins:
```bash
SOCKET_CORS_ORIGINS=http://10.0.2.2:3000,http://localhost:3000
```

### Issue: "Email not sending"
**Solutions:**
1. For development, install MailHog: `brew install mailhog && mailhog`
2. Check SMTP credentials
3. Verify SMTP port is not blocked

---

## Security Best Practices

### Development
- ✅ Use MailHog for email testing
- ✅ Use different JWT secrets than production
- ✅ Keep `.env` in `.gitignore`

### Production
- ⚠️ Use strong, unique JWT_SECRET (64+ characters)
- ⚠️ Use environment variables, not `.env` file
- ⚠️ Restrict CORS to actual frontend domains
- ⚠️ Enable rate limiting
- ⚠️ Use HTTPS only
- ⚠️ Use managed database with SSL
- ⚠️ Use proper email service (SendGrid, AWS SES, etc.)
- ⚠️ Enable monitoring (Sentry, New Relic)

---

## Environment-Specific Configurations

### Development (.env.development)
```bash
NODE_ENV=development
DATABASE_URL="postgresql://localhost:5432/pulse_dev"
JWT_SECRET="dev-secret-at-least-32-characters-long"
SOCKET_CORS_ORIGINS=*
LOG_LEVEL=debug
```

### Production (.env.production)
```bash
NODE_ENV=production
DATABASE_URL="postgresql://user:pass@prod-host:5432/pulse_prod?sslmode=require"
JWT_SECRET="production-secret-very-long-and-secure-generated-secret"
SOCKET_CORS_ORIGINS=https://your-app.com
LOG_LEVEL=error
```

---

## Quick Reference

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `NODE_ENV` | No | `development` | Environment mode |
| `PORT` | No | `3000` | Server port |
| `DATABASE_URL` | **YES** | - | PostgreSQL connection string |
| `JWT_SECRET` | **YES** | - | Must be 32+ characters |
| `JWT_EXPIRES_IN` | No | `24h` | Access token TTL |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Refresh token TTL |
| `SMTP_HOST` | No | `localhost` | Email server |
| `SMTP_PORT` | No | `1025` | Email port |
| `SOCKET_CORS_ORIGINS` | No | See config | Socket.IO CORS |
| `APP_URL` | No | `http://localhost:3000` | Base URL |

---

**Need Help?**

If you encounter issues:
1. Check this guide for common solutions
2. Verify all required variables are set
3. Test database connection with `npx prisma db pull`
4. Check server logs for specific errors
