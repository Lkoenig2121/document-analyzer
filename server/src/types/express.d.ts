import type { Request } from 'express';
import type { FileFilterCallback } from 'multer';
import type { SessionUser } from '../lib/auth.js';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: SessionUser;
      session?: {
        id: string;
        token: string;
        userId: string;
        expiresAt: Date;
      };
    }
  }
}

export {};
