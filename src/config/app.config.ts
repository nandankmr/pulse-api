export const config = {
  port: process.env.PORT || 3000,
  databaseUrl: process.env.DATABASE_URL || 'sqlite:memory:',
  jwtSecret: process.env.JWT_SECRET || 'default-secret',
};
