import type { NextFunction, Request, Response } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { UnauthorizedError } from '../lib/errors.js';
import { auth, type SessionUser } from '../lib/auth.js';
import { prisma } from '../lib/prisma.js';

/**
 * Protects backend routes.
 *
 * Flow:
 *   Request → check session (cookie or Bearer) → allow / 401 reject
 *
 * Valid session → attaches `req.user` + `req.session`, then controller runs.
 * Missing/invalid → 401 Unauthorized.
 *
 * Accepts:
 * - Session cookie (browser clients with credentials)
 * - `Authorization: Bearer <session_token>` (API / mobile clients)
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const resolved = await resolveAuthSession(req);

    if (!resolved?.user?.id) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    req.user = resolved.user;
    req.session = resolved.session;
    next();
  } catch (error) {
    next(error);
  }
}

/** Curriculum alias — same middleware as `requireAuth`. */
export const authMiddleware = requireAuth;

async function resolveAuthSession(req: Request): Promise<{
  user: SessionUser;
  session: {
    id: string;
    token: string;
    userId: string;
    expiresAt: Date;
  };
} | null> {
  const fromBetterAuth = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (fromBetterAuth?.user?.id && fromBetterAuth.session) {
    return {
      user: fromBetterAuth.user as SessionUser,
      session: {
        id: fromBetterAuth.session.id,
        token: fromBetterAuth.session.token,
        userId: fromBetterAuth.session.userId,
        expiresAt: fromBetterAuth.session.expiresAt,
      },
    };
  }

  const bearerToken = extractBearerToken(req.headers.authorization);
  if (!bearerToken) {
    return null;
  }

  const row = await prisma.session.findUnique({
    where: { token: bearerToken },
    include: { user: true },
  });

  if (!row || row.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  return {
    user: row.user as SessionUser,
    session: {
      id: row.id,
      token: row.token,
      userId: row.userId,
      expiresAt: row.expiresAt,
    },
  };
}

function extractBearerToken(authorization: string | undefined): string | null {
  if (!authorization) {
    return null;
  }

  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  const token = match?.[1]?.trim();
  return token || null;
}
