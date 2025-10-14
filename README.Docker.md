# Pulse API - Docker Deployment

## 🚀 Deploy in 1 Command

```bash
./deploy.sh
```

## 📋 What You Need

1. **Docker** - [Install Docker](https://docs.docker.com/get-docker/)
2. **PostgreSQL Database** - External (AWS RDS, Supabase, etc.)
3. **SMTP Server** - SendGrid, AWS SES, Mailgun, etc.

## 🔧 Quick Setup

### 1. Configure Environment

```bash
cp .env.production.example .env.production
```

Edit `.env.production`:

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# JWT (generate with: openssl rand -base64 32)
JWT_SECRET=your-secret-here

# SMTP
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
MAIL_FROM=noreply@yourdomain.com
```

### 2. Deploy

```bash
./deploy.sh
```

### 3. Access

- API: http://localhost:3000
- Docs: http://localhost:3000/api-docs
- Health: http://localhost:3000/health

## 📦 What's Included

- ✅ Multi-stage Docker build (optimized image size)
- ✅ Non-root user (security)
- ✅ Health checks
- ✅ Automatic database migrations
- ✅ Persistent storage (uploads/avatars)
- ✅ Production-ready configuration

## 🎯 Common Commands

```bash
# Using deploy script
./deploy.sh                    # Full deployment

# Using docker-compose
docker-compose up -d           # Start
docker-compose down            # Stop
docker-compose logs -f         # View logs
docker-compose restart         # Restart

# Using Makefile
make deploy                    # Full deployment
make logs                      # View logs
make shell                     # Access container
make migrate                   # Run migrations
make health                    # Health check
```

## 🗄️ Database Setup

### Option 1: Cloud Providers

- **AWS RDS** - Managed PostgreSQL
- **Google Cloud SQL** - Managed PostgreSQL
- **Azure Database** - Managed PostgreSQL
- **DigitalOcean** - Managed Databases

### Option 2: Database-as-a-Service

- **Supabase** - Free tier available
- **Neon** - Serverless PostgreSQL
- **Railway** - Simple deployment
- **Render** - Managed PostgreSQL

### Database URL Format

```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
```

## 📧 SMTP Providers

### SendGrid (Recommended)

```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.your-api-key
```

Free tier: 100 emails/day

### AWS SES

```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-access-key
SMTP_PASSWORD=your-secret-key
```

### Mailgun

```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@yourdomain.com
SMTP_PASSWORD=your-password
```

## 🔐 Security

- ✅ Runs as non-root user
- ✅ Environment variables for secrets
- ✅ No secrets in image
- ✅ Health checks enabled
- ✅ Minimal attack surface

## 📈 Scaling

### Horizontal Scaling

1. Setup Redis:
   ```bash
   SOCKET_REDIS_URL=redis://your-redis:6379
   ```

2. Scale instances:
   ```bash
   docker-compose up -d --scale pulse-api=3
   ```

3. Add load balancer (Nginx, HAProxy, etc.)

## 🐛 Troubleshooting

### Container won't start

```bash
docker-compose logs pulse-api
```

### Database connection failed

```bash
# Test connection
docker-compose run --rm pulse-api npx prisma db pull
```

### Port already in use

Change `PORT` in `.env.production`:
```bash
PORT=3001
```

### Permission issues

```bash
sudo chown -R $USER:$USER storage uploads
chmod -R 755 storage uploads
```

## 📚 Documentation

- [Full Deployment Guide](./DEPLOYMENT.md)
- [Quick Start](./QUICKSTART.md)
- [API Documentation](./docs/)

## 🆘 Support

- Check logs: `docker-compose logs -f`
- Health check: `curl http://localhost:3000/health`
- Review [DEPLOYMENT.md](./DEPLOYMENT.md)

---

**Ready to deploy?** Run `./deploy.sh` 🚀
