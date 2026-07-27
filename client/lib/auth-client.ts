import { createAuthClient } from 'better-auth/react';

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

/**
 * Browser auth client. Talks to Express Better Auth via Next.js rewrite (/api/auth → :3001).
 */
export const authClient = createAuthClient({
  baseURL: appUrl,
});

export const { signIn, signUp, signOut, useSession } = authClient;
