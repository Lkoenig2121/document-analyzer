import type { Request } from 'express';
import type { FileFilterCallback } from 'multer';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export {};
