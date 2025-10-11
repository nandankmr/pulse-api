import express from 'express';
import userRoutes from './modules/user/user.routes';
import { legacyConfig } from './config/app.config';
import { errorHandler } from './shared/middleware/error.middleware';
import { setupSwagger } from './config/swagger.config';

const app = express();
app.use(express.json());

// Setup Swagger documentation
setupSwagger(app);

app.use('/users', userRoutes);

app.use(errorHandler);

app.listen(legacyConfig.port, () => {
  console.log(`🚀 Server running on port ${legacyConfig.port}`);
  console.log(`📚 API Documentation: http://localhost:${legacyConfig.port}/api-docs`);
});
