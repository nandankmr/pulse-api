# 🚀 Quick Start - Deploy in 1 Command

## Prerequisites

- Docker installed
- External PostgreSQL database
- SMTP server credentials

## Deploy Now

```bash
# 1. Copy environment template
cp .env.production.example .env.production

# 2. Edit with your database and SMTP credentials
nano .env.production

# 3. Deploy!
./deploy.sh
```

## Required Configuration

Edit `.env.production` and set:

```bash
# Your PostgreSQL database
DATABASE_URL=postgresql://user:password@your-db-host:5432/pulse_db

# Generate with: openssl rand -base64 32
JWT_SECRET=your-secret-here

# Your SMTP server (e.g., SendGrid, AWS SES)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-api-key
MAIL_FROM=noreply@yourdomain.com
```

## That's It!

Your API will be running at:
- **API**: http://localhost:3000
- **Docs**: http://localhost:3000/api-docs

## Common Commands

```bash
# View logs
docker-compose logs -f

# Stop
docker-compose down

# Restart
docker-compose restart

# Update
git pull && ./deploy.sh
```

## Need Help?

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed documentation.
