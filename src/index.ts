import express from 'express';
import cors from 'cors';
import path from 'path';
import userRoutes from './modules/user/user.routes';
import authRoutes from './modules/auth/auth.routes';
import groupRoutes from './modules/group/group.routes';
import chatRoutes from './modules/chat/chat.routes';
import attachmentRoutes from './modules/attachment/attachment.routes';
import pushRoutes from './modules/push/push.routes';
import { legacyConfig } from './config/app.config';
import { errorHandler } from './shared/middleware/error.middleware';
import { setupSwagger } from './config/swagger.config';
import { getStorageConfig } from './config/env.config';
import { createRealtimeServer } from './realtime/socket.server';
import { prisma } from './shared/services/prisma.service';

const app = express();

// CORS configuration for Android emulator and web clients
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:8081', // React Native Metro bundler
    'http://10.0.2.2:3000',  // Android emulator
    'http://10.0.2.2:8081',  // Android emulator Metro
    /^http:\/\/192\.168\.\d+\.\d+:\d+$/, // Local network
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(express.json());

// Temporary: Log all incoming requests
app.use((req, res, next) => {
  // console.log('\n🔵 INCOMING REQUEST:', {
  //   method: req.method,
  //   url: req.url,
  //   path: req.path,
  //   params: req.params,
  //   query: req.query,
  //   body: req.body,
  //   headers: {
  //     authorization: req.headers.authorization ? 'Bearer ***' : 'none',
  //     contentType: req.headers['content-type'],
  //   },
  // });
  next();
});

// Health check endpoint (for Docker health checks)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Setup Swagger documentation
setupSwagger(app);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/push', pushRoutes);

const storageConfig = getStorageConfig();
const avatarsAbsolutePath = path.resolve(storageConfig.avatarPath);
app.use('/uploads/avatars', express.static(avatarsAbsolutePath));

app.use(errorHandler);

const { httpServer, io } = createRealtimeServer(app);

async function startServer() {
  try {
    await prisma.$connect();
    console.log('🟢 Database connection established');
  } catch (error) {
    console.error('🔴 Failed to connect to the database', error);
    process.exit(1);
  }

  // Listen on all network interfaces (0.0.0.0) to allow Android emulator access
  httpServer.listen(legacyConfig.port, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${legacyConfig.port}`);
    console.log(`📚 API Documentation: http://localhost:${legacyConfig.port}/api-docs`);
    console.log(`🔌 Socket.IO ready on /socket.io`);
    console.log(`📱 Android Emulator: Use http://10.0.2.2:${legacyConfig.port}`);
    console.log(`📱 Physical Device: Use http://<your-local-ip>:${legacyConfig.port}`);
  });
}

startServer();

export { io };
