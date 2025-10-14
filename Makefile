.PHONY: help deploy build up down restart logs shell clean migrate health

# Default target
help:
	@echo "Pulse API - Docker Commands"
	@echo ""
	@echo "Usage:"
	@echo "  make deploy    - Deploy the application (build + migrate + start)"
	@echo "  make build     - Build Docker image"
	@echo "  make up        - Start containers"
	@echo "  make down      - Stop containers"
	@echo "  make restart   - Restart containers"
	@echo "  make logs      - View logs (follow mode)"
	@echo "  make shell     - Access container shell"
	@echo "  make migrate   - Run database migrations"
	@echo "  make health    - Check application health"
	@echo "  make clean     - Remove containers, images, and volumes"
	@echo ""

# Full deployment
deploy:
	@echo "🚀 Deploying Pulse API..."
	@./deploy.sh

# Build Docker image
build:
	@echo "🔨 Building Docker image..."
	@docker-compose build

# Start containers
up:
	@echo "▶️  Starting containers..."
	@docker-compose up -d
	@echo "✅ Containers started"
	@make health

# Stop containers
down:
	@echo "⏹️  Stopping containers..."
	@docker-compose down
	@echo "✅ Containers stopped"

# Restart containers
restart:
	@echo "🔄 Restarting containers..."
	@docker-compose restart
	@echo "✅ Containers restarted"

# View logs
logs:
	@echo "📋 Viewing logs (Ctrl+C to exit)..."
	@docker-compose logs -f pulse-api

# Access container shell
shell:
	@echo "🐚 Accessing container shell..."
	@docker-compose exec pulse-api sh

# Run database migrations
migrate:
	@echo "🗄️  Running database migrations..."
	@docker-compose run --rm pulse-api npx prisma migrate deploy
	@echo "✅ Migrations completed"

# Check health
health:
	@echo "🏥 Checking application health..."
	@sleep 2
	@curl -f http://localhost:3000/health || echo "❌ Health check failed"

# Clean up everything
clean:
	@echo "🧹 Cleaning up Docker resources..."
	@docker-compose down -v
	@docker system prune -f
	@echo "✅ Cleanup completed"

# Development commands
dev-logs:
	@docker-compose logs --tail=100 pulse-api

dev-rebuild:
	@docker-compose down
	@docker-compose build --no-cache
	@docker-compose up -d
	@make logs
