import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';
import { asyncHandler } from '../middleware/error.middleware.js';

const router = Router();

router.get('/', asyncHandler(getHealth));

export default router;
