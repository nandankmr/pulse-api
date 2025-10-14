# Pulse API - Docker Deployment Guide

## 🚀 One-Command Deployment

Deploy the entire application with a single command:

```bash
./deploy.sh
```

---

## 📋 Prerequisites

### Required

1. **Docker** (v20.10+)
   - Install: https://docs.docker.com/get-docker/

2. **Docker Compose** (v2.0+)
   - Usually included with Docker Desktop
   - Standalone install: https://docs.docker.com/compose/install/

3. **External Services**
   - PostgreSQL database (hosted externally)
   - SMTP server (SendGrid, AWS SES, Mailgun, etc.)

### Optional

- Redis (for Socket.IO horizontal scaling)
- Sentry (for error tracking)
- New Relic (for APM)

---

## 🔧 Setup Instructions

### Step 1: Clone the Repository

```bash
git clone <your-repo-url>
cd pulse-api
```

### Step 2: Configure Environment Variables

```bash
# Copy the production environment template
cp .env.production.example .env.production

# Edit the file with your configuration
nano .env.production  # or use your preferred editor
```

### Step 3: Configure Required Variables

Edit `.env.production` and set these **required** variables:

```bash
# Database (External PostgreSQL)
DATABASE_URL=postgresql://user:password@your-db-host:5432/pulse_db?schema=public

# JWT Secret (Generate with: openssl rand -base64 32)
JWT_SECRET=your-super-secret-jwt-key-change-this

# SMTP Configuration
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
MAIL_FROM=noreply@yourdomain.com
```

### Step 4: Deploy

```bash
# Make the deploy script executable (first time only)
chmod +x deploy.sh

# Deploy the application
./deploy.sh
```

That's it! 🎉

---

## 📦 What the Deployment Does

The `deploy.sh` script automatically:

1. ✅ Validates environment variables
2. ✅ Checks Docker installation
3. ✅ Creates storage directories
4. ✅ Stops existing containers
5. ✅ Builds Docker image
6. ✅ Runs database migrations
7. ✅ Starts the application
8. ✅ Performs health checks

---

## 🌐 Accessing the Application

After successful deployment:

- **API**: http://localhost:3000
- **API Docs**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health

---

## 📊 Managing the Application

### View Logs

```bash
# Follow logs in real-time
docker-compose logs -f pulse-api

# View last 100 lines
docker-compose logs --tail=100 pulse-api
```

### Stop the Application

```bash
docker-compose down
```

### Restart the Application

```bash
docker-compose restart pulse-api
```

### Update the Application

```bash
# Pull latest code
git pull

# Redeploy
./deploy.sh
```

### Access Container Shell

```bash
docker-compose exec pulse-api sh
```

### Run Database Migrations Manually

```bash
docker-compose run --rm pulse-api npx prisma migrate deploy
```

---

## 🗄️ Database Setup

### External PostgreSQL Database

You need a PostgreSQL database hosted externally. Options:

1. **Cloud Providers**
   - AWS RDS
   - Google Cloud SQL
   - Azure Database for PostgreSQL
   - DigitalOcean Managed Databases

2. **Database-as-a-Service**
   - Supabase
   - Neon
   - Railway
   - Render

3. **Self-Hosted**
   - Your own PostgreSQL server

### Database URL Format

```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
```

Example:
```
postgresql://pulse_user:SecurePass123@db.example.com:5432/pulse_production?schema=public
```

### Initial Setup

1. Create the database
2. Set `DATABASE_URL` in `.env.production`
3. Run deployment - migrations will run automatically

---

## 📧 SMTP Configuration

### Recommended Providers

1. **SendGrid** (Recommended)
   ```bash
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASSWORD=your-sendgrid-api-key
   ```

2. **AWS SES**
   ```bash
   SMTP_HOST=email-smtp.us-east-1.amazonaws.com
   SMTP_PORT=587
   SMTP_USER=your-aws-access-key
   SMTP_PASSWORD=your-aws-secret-key
   ```

3. **Mailgun**
   ```bash
   SMTP_HOST=smtp.mailgun.org
   SMTP_PORT=587
   SMTP_USER=postmaster@yourdomain.com
   SMTP_PASSWORD=your-mailgun-password
   ```

4. **Gmail** (Development only)
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-app-password
   ```

---

## 🔐 Security Best Practices

### 1. Environment Variables

- ✅ Never commit `.env.production` to Git
- ✅ Use strong, random JWT secrets
- ✅ Rotate secrets regularly
- ✅ Use different secrets for dev/staging/production

### 2. Database

- ✅ Use strong passwords
- ✅ Enable SSL/TLS connections
- ✅ Restrict network access (firewall rules)
- ✅ Regular backups

### 3. SMTP

- ✅ Use API keys instead of passwords
- ✅ Rotate API keys regularly
- ✅ Monitor usage for anomalies

### 4. Docker

- ✅ Keep Docker images updated
- ✅ Run as non-root user (already configured)
- ✅ Limit container resources if needed

---

## 📈 Scaling

### Horizontal Scaling with Redis

For multiple instances behind a load balancer:

1. **Setup Redis** (external)
   - AWS ElastiCache
   - Redis Cloud
   - Self-hosted Redis

2. **Configure Socket.IO**
   ```bash
   SOCKET_REDIS_URL=redis://your-redis-host:6379
   ```

3. **Deploy Multiple Instances**
   ```bash
   docker-compose up -d --scale pulse-api=3
   ```

4. **Use Load Balancer**
   - Nginx
   - HAProxy
   - AWS ALB
   - Cloudflare

---

## 🔍 Monitoring

### Health Checks

The application includes a health check endpoint:

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

### Optional Monitoring Tools

1. **Sentry** (Error Tracking)
   ```bash
   SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
   ```

2. **New Relic** (APM)
   ```bash
   NEW_RELIC_LICENSE_KEY=your-new-relic-license-key
   ```

### Docker Stats

```bash
# View resource usage
docker stats pulse-api

# View container info
docker inspect pulse-api
```

---

## 🐛 Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs pulse-api

# Check if port is already in use
lsof -i :3000

# Rebuild without cache
docker-compose build --no-cache
```

### Database Connection Failed

```bash
# Test database connection
docker-compose run --rm pulse-api npx prisma db pull

# Check DATABASE_URL format
echo $DATABASE_URL
```

### Permission Issues

```bash
# Fix storage permissions
sudo chown -R $USER:$USER storage uploads
chmod -R 755 storage uploads
```

### Out of Disk Space

```bash
# Clean up Docker
docker system prune -a

# Remove unused volumes
docker volume prune
```

---

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to server
        env:
          SSH_KEY: ${{ secrets.SSH_KEY }}
        run: |
          ssh user@your-server "cd /app/pulse-api && git pull && ./deploy.sh"
```

### GitLab CI Example

```yaml
deploy:
  stage: deploy
  script:
    - ssh user@your-server "cd /app/pulse-api && git pull && ./deploy.sh"
  only:
    - main
```

---

## 📝 Environment Variables Reference

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Secret for JWT tokens | `openssl rand -base64 32` |
| `SMTP_HOST` | SMTP server hostname | `smtp.sendgrid.net` |
| `SMTP_USER` | SMTP username | `apikey` |
| `SMTP_PASSWORD` | SMTP password/API key | `SG.xxx` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `production` |
| `LOG_LEVEL` | Logging level | `info` |
| `SOCKET_CORS_ORIGINS` | Allowed origins | `*` |
| `SOCKET_REDIS_URL` | Redis for scaling | - |
| `SENTRY_DSN` | Sentry error tracking | - |

---

## 🆘 Support

### Common Issues

1. **Port already in use**
   - Change `PORT` in `.env.production`
   - Or stop the conflicting service

2. **Database migrations fail**
   - Check `DATABASE_URL` is correct
   - Ensure database exists
   - Check network connectivity

3. **File upload errors**
   - Check `storage` and `uploads` directories exist
   - Check permissions: `chmod -R 755 storage uploads`

### Getting Help

- Check logs: `docker-compose logs -f`
- Review documentation in `/docs`
- Check GitHub issues

---

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

**Last Updated:** October 14, 2025
