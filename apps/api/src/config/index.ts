import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiVersion: process.env.API_VERSION || 'v1',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  customerClientUrl: process.env.CUSTOMER_CLIENT_URL || 'http://localhost:3002',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'fallback_access_secret_key_123',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_key_123',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  databaseUrl: process.env.DATABASE_URL || '',
};

export type Config = typeof config;
