#!/bin/bash

# Pulse API Deployment Script
# This script deploys the application using Docker

set -e  # Exit on error

echo "🚀 Starting Pulse API Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${RED}❌ Error: .env.production file not found${NC}"
    echo -e "${YELLOW}Please create .env.production from .env.production.example${NC}"
    echo "cp .env.production.example .env.production"
    echo "Then edit .env.production with your configuration"
    exit 1
fi

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# Validate required environment variables
REQUIRED_VARS=("DATABASE_URL" "JWT_SECRET" "SMTP_HOST" "SMTP_USER" "SMTP_PASSWORD")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo -e "${RED}❌ Error: Missing required environment variables:${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    exit 1
fi

echo -e "${GREEN}✅ Environment variables validated${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Error: Docker is not installed${NC}"
    echo "Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Error: Docker Compose is not installed${NC}"
    echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✅ Docker and Docker Compose are installed${NC}"

# Create necessary directories
echo "📁 Creating storage directories..."
mkdir -p storage/avatars
mkdir -p uploads

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down || true

# Build the Docker image
echo "🔨 Building Docker image..."
docker-compose build --no-cache

# Run database migrations
echo "🗄️  Running database migrations..."
docker-compose run --rm pulse-api npx prisma migrate deploy

# Start the application
echo "🚀 Starting application..."
docker-compose up -d

# Wait for health check
echo "⏳ Waiting for application to be healthy..."
sleep 10

# Check if container is running
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo ""
    echo "📊 Container status:"
    docker-compose ps
    echo ""
    echo "📝 View logs:"
    echo "  docker-compose logs -f pulse-api"
    echo ""
    echo "🌐 Application is running on:"
    echo "  http://localhost:${PORT:-3000}"
    echo ""
    echo "📚 API Documentation:"
    echo "  http://localhost:${PORT:-3000}/api-docs"
else
    echo -e "${RED}❌ Deployment failed. Check logs:${NC}"
    echo "  docker-compose logs pulse-api"
    exit 1
fi
