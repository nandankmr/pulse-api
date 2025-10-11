# Pulse API

A comprehensive Node.js TypeScript backend API built with enterprise-level best practices, featuring user management, caching, monitoring, testing, and comprehensive documentation.

## 🚀 Features

- **TypeScript**: Full TypeScript support with strict mode
- **Modular Architecture**: Clean separation of concerns with modules, services, and repositories
- **Database Integration**: Prisma ORM with PostgreSQL/SQLite support
- **Caching**: In-memory caching with TTL support for improved performance
- **Pagination**: Built-in pagination support for API endpoints
- **Error Handling**: Comprehensive error handling with custom error classes
- **Logging**: Structured logging with Winston and daily rotation
- **Monitoring**: Error tracking and performance monitoring setup
- **Testing**: Unit and integration tests with Jest
- **API Documentation**: Swagger/OpenAPI documentation
- **Environment Configuration**: Zod-validated environment variables
- **Security**: Input validation, sanitization, and security best practices

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Development](#development)
- [Testing](#testing)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Contributing](#contributing)

## 🔧 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- PostgreSQL (for production) or SQLite (for development)

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pulse-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up the database**
   ```bash
   # For development (SQLite)
   npm run db:generate
   npm run db:migrate

   # For production (PostgreSQL)
   # Update DATABASE_URL in .env and run:
   npm run db:migrate
   ```

## ⚙️ Configuration

The application uses environment-based configuration with validation. Key configuration options:

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `development` | No |
| `PORT` | Server port | `3000` | No |
| `DATABASE_URL` | Database connection URL | `file:./dev.db` | Yes |
| `LOG_LEVEL` | Logging level | `info` | No |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | - | Yes |
| `CACHE_TTL` | Cache time-to-live in seconds | `300` | No |

### Configuration Files

- `.env` - Environment variables (create from `.env.example`)
- `src/config/env.config.ts` - Environment validation and configuration
- `src/config/app.config.ts` - Application configuration

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server with hot reload
npm run build           # Build for production
npm run start           # Start production server

# Code Quality
npm run lint            # Run ESLint
npm run lint:fix        # Fix ESLint errors
npm run format          # Format code with Prettier
npm run format:check    # Check code formatting

# Testing
npm run test            # Run tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage report

# Database
npm run db:generate     # Generate Prisma client
npm run db:migrate      # Run database migrations
npm run db:studio       # Open Prisma Studio

# Dependencies
npm run audit           # Check for vulnerabilities
npm run audit:fix       # Fix vulnerabilities
npm run deps:check      # Check for outdated dependencies
npm run deps:update     # Update dependencies
```

### Development Workflow

1. **Start the development server**
   ```bash
   npm run dev
   ```

2. **Make your changes** and see them reflected immediately

3. **Run tests** to ensure nothing is broken
   ```bash
   npm run test
   ```

4. **Check code quality**
   ```bash
   npm run lint && npm run format:check
   ```

## 🧪 Testing

The project includes comprehensive testing:

- **Unit Tests**: Test individual functions and services
- **Integration Tests**: Test API endpoints and database interactions
- **Test Coverage**: Aim for 80%+ coverage

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test user.service.test.ts
```

### Writing Tests

Tests are located in the `tests/` directory and follow this structure:

```
tests/
├── modules/          # Module-specific tests
│   └── user/
├── shared/           # Shared utility tests
├── integration/      # Integration tests
└── setup.ts         # Test configuration
```

## 📚 API Documentation

### Swagger/OpenAPI Documentation

When the server is running, visit:
- **Swagger UI**: `http://localhost:3000/api-docs`
- **OpenAPI JSON**: `http://localhost:3000/api-docs.json`

### API Endpoints

#### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | Get all users (with pagination) |
| GET | `/users/:id` | Get user by ID |
| POST | `/users` | Create new user |

#### Query Parameters (GET /users)

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)

#### Request/Response Examples

**Create User**
```bash
POST /users
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john.doe@example.com"
}
```

**Response:**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john.doe@example.com",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "deletedAt": null
}
```

**Get Users with Pagination**
```bash
GET /users?page=1&limit=5
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john.doe@example.com",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "deletedAt": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 5,
    "total": 25,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## 🚀 Deployment

### Build for Production

```bash
npm run build
npm run start
```

### Environment Setup

1. **Set production environment variables**
2. **Configure database connection**
3. **Set up monitoring (Sentry, etc.)**
4. **Configure reverse proxy (nginx)**
5. **Set up SSL certificates**

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["npm", "start"]
```

## 📁 Project Structure

```
pulse-api/
├── src/
│   ├── config/           # Configuration files
│   │   ├── app.config.ts
│   │   ├── env.config.ts
│   │   └── swagger.config.ts
│   ├── modules/          # Feature modules
│   │   └── user/
│   │       ├── user.controller.ts
│   │       ├── user.service.ts
│   │       ├── user.repository.ts
│   │       ├── user.routes.ts
│   │       └── user.model.ts
│   ├── shared/           # Shared utilities and middleware
│   │   ├── errors/       # Custom error classes
│   │   ├── middleware/   # Express middleware
│   │   ├── services/     # Shared services
│   │   └── utils/        # Utility functions
│   └── index.ts         # Application entry point
├── tests/               # Test files
├── prisma/              # Database schema and migrations
├── scripts/             # Build and deployment scripts
├── .env.example         # Environment variables template
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**
4. **Run tests**: `npm run test`
5. **Check code quality**: `npm run lint && npm run format:check`
6. **Commit changes**: `git commit -m 'Add amazing feature'`
7. **Push to branch**: `git push origin feature/amazing-feature`
8. **Open a Pull Request**

### Code Style

- Use **TypeScript** for all new code
- Follow **ESLint** and **Prettier** configurations
- Use **camelCase** for variables and functions
- Use **PascalCase** for classes and interfaces
- Write **JSDoc** comments for all public methods
- Maintain **80%+ test coverage**

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [API Documentation](#api-documentation)
2. Review the [Configuration](#configuration) section
3. Open an issue in the repository
4. Contact the development team

---

**Built with ❤️ using Node.js, TypeScript, and enterprise best practices**
