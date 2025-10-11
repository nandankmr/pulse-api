import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';

/**
 * Swagger/OpenAPI configuration options
 */
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Pulse API',
      version: '1.0.0',
      description: 'A comprehensive Node.js TypeScript backend API with user management, caching, and monitoring',
      contact: {
        name: 'API Support',
        email: 'support@pulse-api.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development server',
      },
      {
        url: 'https://api.pulse-app.com/api/v1',
        description: 'Production server',
      },
    ],
    components: {
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Unique identifier for the user',
              example: 1,
            },
            name: {
              type: 'string',
              description: 'User\'s full name',
              example: 'John Doe',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User\'s email address',
              example: 'john.doe@example.com',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when the user was created',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when the user was last updated',
            },
            deletedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Timestamp when the user was soft deleted',
            },
          },
          required: ['id', 'name', 'email'],
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/User',
              },
              description: 'Array of user objects',
            },
            pagination: {
              type: 'object',
              properties: {
                page: {
                  type: 'integer',
                  description: 'Current page number',
                  example: 1,
                },
                limit: {
                  type: 'integer',
                  description: 'Number of items per page',
                  example: 10,
                },
                total: {
                  type: 'integer',
                  description: 'Total number of items',
                  example: 100,
                },
                totalPages: {
                  type: 'integer',
                  description: 'Total number of pages',
                  example: 10,
                },
                hasNext: {
                  type: 'boolean',
                  description: 'Whether there is a next page',
                  example: true,
                },
                hasPrev: {
                  type: 'boolean',
                  description: 'Whether there is a previous page',
                  example: false,
                },
              },
            },
          },
        },
        CreateUserRequest: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'User\'s full name',
              example: 'Jane Doe',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User\'s email address',
              example: 'jane.doe@example.com',
            },
          },
          required: ['name', 'email'],
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              description: 'Error message',
              example: 'User not found',
            },
            code: {
              type: 'string',
              description: 'Error code',
              example: 'USER_NOT_FOUND',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'When the error occurred',
            },
          },
        },
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Authorization header using the Bearer scheme',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    './src/modules/user/user.controller.ts',
    './src/modules/user/user.routes.ts',
  ],
};

/**
 * Generate Swagger specification
 */
const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * Setup Swagger UI middleware
 * @param app - Express application instance
 */
export function setupSwagger(app: Application): void {
  // Serve Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Pulse API Documentation',
  }));

  // Serve Swagger JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log('📚 Swagger documentation available at: http://localhost:3000/api-docs');
}

/**
 * Get Swagger specification
 */
export { swaggerSpec };
export default swaggerSpec;
