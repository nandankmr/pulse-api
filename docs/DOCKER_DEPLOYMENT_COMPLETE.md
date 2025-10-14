# ✅ Docker Deployment - Complete Setup

**Date:** October 14, 2025  
**Status:** Ready for Production

---

## 🎉 What's Been Created

Your Pulse API is now fully Dockerized and ready for one-command deployment!

### Files Created

1. **`Dockerfile`** - Multi-stage production build
2. **`.dockerignore`** - Optimized build context
3. **`docker-compose.yml`** - Container orchestration
4. **`.env.production.example`** - Production environment template
5. **`deploy.sh`** - One-command deployment script
6. **`Makefile`** - Convenient command shortcuts
7. **`DEPLOYMENT.md`** - Comprehensive deployment guide
8. **`QUICKSTART.md`** - Quick start guide
9. **`README.Docker.md`** - Docker-specific README

### Code Changes

1. **Health Check Endpoint** - Added `/health` endpoint in `src/index.ts`
2. **Attachment Routes** - Registered in main app (already done)

---

## 🚀 How to Deploy

### One Command Deployment

```bash
./deploy.sh
```

That's it! The script will:
1. ✅ Validate environment variables
2. ✅ Check Docker installation
3. ✅ Build the image
4. ✅ Run database migrations
5. ✅ Start the application
6. ✅ Perform health checks

---

## 📋 Prerequisites

### Required

1. **Docker** (v20.10+)
   ```bash
   docker --version
   ```

2. **Docker Compose** (v2.0+)
   ```bash
   docker-compose --version
   ```

3. **External PostgreSQL Database**
   - AWS RDS
   - Supabase
   - Neon
   - Railway
   - Or any PostgreSQL server

4. **SMTP Server**
   - SendGrid (recommended)
   - AWS SES
   - Mailgun
   - Gmail (dev only)

---

## ⚙️ Configuration Steps

### Step 1: Copy Environment Template

```bash
cp .env.production.example .env.production
```

### Step 2: Edit Configuration

```bash
nano .env.production  # or your preferred editor
```

### Step 3: Set Required Variables

```bash
# Database (REQUIRED)
DATABASE_URL=postgresql://user:password@your-db-host:5432/pulse_db?schema=public

# JWT Secret (REQUIRED) - Generate with: openssl rand -base64 32
JWT_SECRET=your-super-secret-jwt-key-change-this

# SMTP (REQUIRED)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
MAIL_FROM=noreply@yourdomain.com
```

### Step 4: Deploy

```bash
chmod +x deploy.sh  # First time only
./deploy.sh
```

---

## 🎯 Quick Commands Reference

### Using Deploy Script

```bash
./deploy.sh                    # Full deployment
```

### Using Docker Compose

```bash
docker-compose up -d           # Start containers
docker-compose down            # Stop containers
docker-compose logs -f         # View logs (follow)
docker-compose restart         # Restart
docker-compose ps              # Check status
```

### Using Makefile

```bash
make deploy                    # Full deployment
make up                        # Start containers
make down                      # Stop containers
make logs                      # View logs
make shell                     # Access container shell
make migrate                   # Run migrations
make health                    # Health check
make clean                     # Clean up everything
```

---

## 🌐 Accessing Your Application

After successful deployment:

| Service | URL |
|---------|-----|
| **API** | http://localhost:3000 |
| **API Docs** | http://localhost:3000/api-docs |
| **Health Check** | http://localhost:3000/health |
| **Socket.IO** | ws://localhost:3000/socket.io |

---

## 🗄️ Database Setup Examples

### Supabase (Free Tier)

1. Create project at https://supabase.com
2. Get connection string from Settings > Database
3. Format:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

### AWS RDS

1. Create PostgreSQL instance
2. Note endpoint, port, username, password
3. Format:
   ```
   postgresql://username:password@endpoint.rds.amazonaws.com:5432/pulse_db
   ```

### Neon (Serverless)

1. Create project at https://neon.tech
2. Get connection string from dashboard
3. Format:
   ```
   postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname
   ```

---

## 📧 SMTP Setup Examples

### SendGrid (Recommended)

1. Sign up at https://sendgrid.com (100 emails/day free)
2. Create API key
3. Configure:
   ```bash
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASSWORD=SG.your-api-key-here
   MAIL_FROM=noreply@yourdomain.com
   ```

### AWS SES

1. Setup SES in AWS Console
2. Create SMTP credentials
3. Configure:
   ```bash
   SMTP_HOST=email-smtp.us-east-1.amazonaws.com
   SMTP_PORT=587
   SMTP_USER=your-access-key-id
   SMTP_PASSWORD=your-secret-access-key
   MAIL_FROM=verified@yourdomain.com
   ```

---

## 🔍 Monitoring & Health Checks

### Health Check Endpoint

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-10-14T14:00:00.000Z",
  "uptime": 12345.67
}
```

### Docker Health Check

Built-in health check runs every 30 seconds:

```bash
docker inspect pulse-api | grep -A 10 Health
```

### View Logs

```bash
# Real-time logs
docker-compose logs -f pulse-api

# Last 100 lines
docker-compose logs --tail=100 pulse-api

# Logs since 1 hour ago
docker-compose logs --since 1h pulse-api
```

---

## 📈 Production Deployment Options

### Option 1: Single Server

```bash
# On your server
git clone <repo>
cd pulse-api
cp .env.production.example .env.production
# Edit .env.production
./deploy.sh
```

### Option 2: Docker Hub

```bash
# Build and push
docker build -t yourusername/pulse-api:latest .
docker push yourusername/pulse-api:latest

# On server
docker pull yourusername/pulse-api:latest
docker run -d -p 3000:3000 --env-file .env.production yourusername/pulse-api:latest
```

### Option 3: Cloud Platforms

- **AWS ECS/Fargate** - Use Dockerfile
- **Google Cloud Run** - Use Dockerfile
- **Azure Container Instances** - Use Dockerfile
- **DigitalOcean App Platform** - Use Dockerfile
- **Railway** - Auto-detects Dockerfile
- **Render** - Auto-detects Dockerfile

---

## 🔐 Security Checklist

- [x] Runs as non-root user
- [x] Environment variables for secrets
- [x] No secrets in Docker image
- [x] Health checks enabled
- [x] Minimal base image (Alpine)
- [x] Multi-stage build (smaller image)
- [ ] SSL/TLS (add reverse proxy)
- [ ] Rate limiting (add if needed)
- [ ] Firewall rules (configure on server)

---

## 🐛 Common Issues & Solutions

### Issue: Container won't start

```bash
# Check logs
docker-compose logs pulse-api

# Check if port is in use
lsof -i :3000

# Rebuild without cache
docker-compose build --no-cache
```

### Issue: Database connection failed

```bash
# Test database connection
docker-compose run --rm pulse-api npx prisma db pull

# Check DATABASE_URL format
cat .env.production | grep DATABASE_URL
```

### Issue: Permission denied on storage

```bash
# Fix permissions
sudo chown -R $USER:$USER storage uploads
chmod -R 755 storage uploads
```

### Issue: Out of disk space

```bash
# Clean up Docker
docker system prune -a
docker volume prune
```

---

## 📊 Resource Requirements

### Minimum

- **CPU**: 1 core
- **RAM**: 512 MB
- **Disk**: 2 GB

### Recommended

- **CPU**: 2 cores
- **RAM**: 2 GB
- **Disk**: 10 GB

### Production

- **CPU**: 4 cores
- **RAM**: 4 GB
- **Disk**: 20 GB

---

## 🔄 Update & Maintenance

### Update Application

```bash
git pull
./deploy.sh
```

### Run Migrations Only

```bash
docker-compose run --rm pulse-api npx prisma migrate deploy
```

### Backup Volumes

```bash
# Backup uploads
tar -czf uploads-backup.tar.gz uploads/

# Backup avatars
tar -czf storage-backup.tar.gz storage/
```

### Restore Volumes

```bash
# Restore uploads
tar -xzf uploads-backup.tar.gz

# Restore avatars
tar -xzf storage-backup.tar.gz
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| `DEPLOYMENT.md` | Comprehensive deployment guide |
| `QUICKSTART.md` | Quick start guide |
| `README.Docker.md` | Docker-specific README |
| `docs/FRONTEND_CHATS_API.md` | Chats API documentation |
| `docs/FRONTEND_USER_SEARCH_API.md` | User search API |

---

## ✅ Deployment Checklist

Before deploying to production:

- [ ] External PostgreSQL database setup
- [ ] SMTP server configured
- [ ] `.env.production` created and configured
- [ ] JWT_SECRET generated (use `openssl rand -base64 32`)
- [ ] Docker and Docker Compose installed
- [ ] Firewall rules configured (if applicable)
- [ ] SSL/TLS certificate (if using HTTPS)
- [ ] Domain name configured (if applicable)
- [ ] Monitoring setup (optional)
- [ ] Backup strategy in place

---

## 🎉 You're Ready!

Everything is set up for one-command deployment:

```bash
./deploy.sh
```

Your Pulse API will be:
- ✅ Built with optimized Docker image
- ✅ Running with health checks
- ✅ Connected to external database
- ✅ Sending emails via SMTP
- ✅ Persisting uploads and avatars
- ✅ Production-ready!

---

**Questions?** Check the documentation or run `make help`

**Need help?** Review `DEPLOYMENT.md` for detailed troubleshooting

**Ready to deploy?** Run `./deploy.sh` 🚀
