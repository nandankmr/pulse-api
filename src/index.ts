import express from 'express';
import userRoutes from './modules/user/user.routes';
import { config } from './config/app.config';

const app = express();
app.use(express.json());

app.use('/users', userRoutes);

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});
