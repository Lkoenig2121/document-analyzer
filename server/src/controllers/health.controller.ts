import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export async function getHealth(_req: Request, res: Response): Promise<void> {
  let databaseStatus: 'connected' | 'disconnected' = 'disconnected';

  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseStatus = 'connected';
  } catch {
    databaseStatus = 'disconnected';
  }

  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: databaseStatus,
    },
  });
}
