import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from backend/.env or root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

export interface AppConfig {
  env: 'development' | 'production' | 'test';
  port: number;
  corsOrigin: string | string[];
  isProduction: boolean;
  isDevelopment: boolean;
  // Future phase placeholders (optional in Phase 3)
  mongodbUri?: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  geminiApiKey?: string;
}

const nodeEnv = (process.env.NODE_ENV as AppConfig['env']) || 'development';
const port = parseInt(process.env.PORT || '5000', 10);
const rawCorsOrigin = process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:5173';

// Parse multiple origins if comma-separated
const corsOrigin = rawCorsOrigin.includes(',')
  ? rawCorsOrigin.split(',').map((origin) => origin.trim())
  : rawCorsOrigin;

export const config: AppConfig = {
  env: nodeEnv,
  port: isNaN(port) ? 5000 : port,
  corsOrigin,
  isProduction: nodeEnv === 'production',
  isDevelopment: nodeEnv === 'development',
  mongodbUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET || 'smart-metrology-jwt-secret-sih26034-2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  geminiApiKey: process.env.GEMINI_API_KEY,
};
