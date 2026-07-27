const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '/api';
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'Document Analyzer';

export const env = {
  apiUrl,
  appUrl,
  appName,
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
} as const;
