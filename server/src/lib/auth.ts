import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { bearer } from 'better-auth/plugins';
import { env } from '../config/env.js';
import { prisma } from './prisma.js';

/**
 * Better Auth instance (Express).
 * Sessions live in PostgreSQL via Prisma; Next.js talks to /api/auth through a rewrite.
 * Bearer plugin enables `Authorization: Bearer <session_token>` alongside cookies.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.CORS_ORIGIN],
  emailAndPassword: {
    enabled: true,
  },
  plugins: [bearer()],
});

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
};
