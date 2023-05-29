import dotenv from 'dotenv';

dotenv.config();

export const BS_PORT = process.env.BS_PORT ?? '3000';
export const BS_DB = process.env.BS_DB ?? 'mongodb://127.0.0.1:27017/blog';
export const PINO_LOG_LEVEL = process.env.PINO_LOG_LEVEL ?? 'info';
export const JWT_TTL = parseInt(process.env.JWT_TTL ?? '3600');
export const JWT_SECRET = process.env.JWT_SECRET ?? 'secret'