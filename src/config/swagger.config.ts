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
        AuthRegisterRequest: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'User full name',
              example: 'Jane Doe',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'jane.doe@example.com',
            },
            password: {
              type: 'string',
              example: 'StrongPassword123!',
            },
            deviceId: {
              type: 'string',
              nullable: true,
              example: 'device-uuid',
            },
            deviceName: {
              type: 'string',
              nullable: true,
              example: 'iPhone 15',
            },
            platform: {
              type: 'string',
              nullable: true,
              example: 'ios',
            },
          },
          required: ['name', 'email', 'password'],
        },
        AuthLoginRequest: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'jane.doe@example.com',
            },
            password: {
              type: 'string',
              example: 'StrongPassword123!',
            },
            deviceId: {
              type: 'string',
              nullable: true,
              example: 'device-uuid',
            },
            deviceName: {
              type: 'string',
              nullable: true,
              example: 'MacBook Pro',
            },
            platform: {
              type: 'string',
              nullable: true,
              example: 'macos',
            },
          },
          required: ['email', 'password'],
        },
        AuthRefreshRequest: {
          type: 'object',
          properties: {
            refreshToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
            deviceId: {
              type: 'string',
              nullable: true,
              example: 'device-uuid',
            },
          },
          required: ['refreshToken'],
        },
        AuthVerifyEmailRequest: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'jane.doe@example.com',
            },
            otp: {
              type: 'string',
              description: 'One-time passcode sent via email',
              example: '123456',
              minLength: 6,
              maxLength: 6,
            },
          },
          required: ['email', 'otp'],
        },
        AuthTokens: {
          type: 'object',
          properties: {
            accessToken: {
              type: 'string',
            },
            refreshToken: {
              type: 'string',
            },
            deviceId: {
              type: 'string',
            },
          },
          required: ['accessToken', 'refreshToken', 'deviceId'],
        },
        AuthResponse: {
          type: 'object',
          properties: {
            user: {
              $ref: '#/components/schemas/User',
            },
            tokens: {
              $ref: '#/components/schemas/AuthTokens',
            },
          },
          required: ['user', 'tokens'],
        },
        AuthVerifyEmailResponse: {
          type: 'object',
          properties: {
            user: {
              $ref: '#/components/schemas/User',
            },
          },
          required: ['user'],
        },
        UserProfileUpdateRequest: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'New display name',
              example: 'Alex Smith',
            },
            password: {
              type: 'string',
              description: 'New password (will be hashed)',
              example: 'NewPassword123!',
            },
          },
        },
        UserSearchResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/User',
              },
            },
          },
          required: ['data'],
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier for the user',
              example: 'f6c1d6c4-08a1-4fb8-9bfc-2ef9a3ce5678',
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
        GroupMember: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'Member user identifier',
              example: '8f1556a1-4bc2-42d8-9d14-9b8b5b1c1c0e',
            },
            role: {
              type: 'string',
              enum: ['ADMIN', 'MEMBER'],
              description: 'Role within the group',
              example: 'ADMIN',
            },
            joinedAt: {
              type: 'string',
              format: 'date-time',
              description: 'When the user joined the group',
            },
          },
          required: ['userId', 'role', 'joinedAt'],
        },
        Group: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Group identifier',
              example: 'f169ab02-e49a-4c43-8e66-e5d0e6bf4101',
            },
            name: {
              type: 'string',
              description: 'Group name',
              example: 'Engineering Team',
            },
            description: {
              type: 'string',
              nullable: true,
              description: 'Group description',
              example: 'All engineers in the company',
            },
            avatarUrl: {
              type: 'string',
              nullable: true,
              description: 'Optional URL to group avatar image',
              example: 'https://cdn.pulse-app.com/groups/avatars/eng-team.png',
            },
            createdBy: {
              type: 'string',
              description: 'User id of group creator',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
            members: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/GroupMember',
              },
            },
          },
          required: ['id', 'name', 'createdBy', 'createdAt', 'updatedAt', 'members'],
        },
        GroupCreateRequest: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              example: 'Product Squad',
            },
            description: {
              type: 'string',
              nullable: true,
              example: 'Collaborative group for product initiatives',
            },
            avatarUrl: {
              type: 'string',
              nullable: true,
              example: 'https://cdn.pulse-app.com/groups/product.png',
            },
          },
          required: ['name'],
        },
        GroupUpdateRequest: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
            },
            description: {
              type: 'string',
              nullable: true,
            },
            avatarUrl: {
              type: 'string',
              nullable: true,
            },
          },
          description: 'At least one property must be provided',
        },
        GroupMemberRequest: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'User to add to the group',
            },
            role: {
              type: 'string',
              enum: ['ADMIN', 'MEMBER'],
              description: 'Role for the user (defaults to MEMBER)',
            },
          },
          required: ['userId'],
        },
        GroupMemberRoleUpdateRequest: {
          type: 'object',
          properties: {
            role: {
              type: 'string',
              enum: ['ADMIN', 'MEMBER'],
            },
          },
          required: ['role'],
        },
        GroupListResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Group',
              },
            },
          },
          required: ['data'],
        },
        GroupInvitation: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Invitation identifier',
            },
            groupId: {
              type: 'string',
            },
            inviterId: {
              type: 'string',
            },
            token: {
              type: 'string',
              description: 'Token used to join the group',
            },
            inviteeEmail: {
              type: 'string',
              nullable: true,
            },
            expiresAt: {
              type: 'string',
              format: 'date-time',
            },
            acceptedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
          required: ['id', 'groupId', 'inviterId', 'token', 'expiresAt', 'createdAt'],
        },
        GroupInvitationCreateRequest: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              nullable: true,
              format: 'email',
            },
            expiresInHours: {
              type: 'integer',
              nullable: true,
              minimum: 1,
              maximum: 336,
              description: 'Expiration window in hours (default 72, max 336)',
            },
          },
        },
        GroupJoinRequest: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'Invitation token',
            },
          },
          required: ['token'],
        },
        GroupInvitationResponse: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
            },
            groupId: {
              type: 'string',
            },
            token: {
              type: 'string',
            },
            inviteeEmail: {
              type: 'string',
              nullable: true,
            },
            expiresAt: {
              type: 'string',
              format: 'date-time',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
          required: ['id', 'groupId', 'token', 'expiresAt', 'createdAt'],
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
    './src/modules/auth/auth.controller.ts',
    './src/modules/auth/auth.routes.ts',
    './src/modules/group/group.controller.ts',
    './src/modules/group/group.routes.ts',
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
