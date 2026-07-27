import { Router } from 'express';
import {
  analyzeDocument,
  chatDocument,
  createDocument,
  getDocument,
  listDocuments,
  listTopics,
  searchDocuments,
  serveDocumentFile,
} from '../controllers/document.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { handleUploadError, upload } from '../middleware/upload.middleware.js';

const router = Router();

/**
 * Day 3 — all document routes require auth (cookie or Bearer).
 * Covers POST /, GET /, POST /:id/chat and every other document endpoint.
 */
router.use(asyncHandler(requireAuth));

const uploadHandlers = [
  upload.single('file'),
  handleUploadError,
  asyncHandler(createDocument),
] as const;

router.get('/', asyncHandler(listDocuments));
router.get('/search', asyncHandler(searchDocuments));
router.get('/topics', asyncHandler(listTopics));
router.get('/:id/file', asyncHandler(serveDocumentFile));
router.post('/:id/chat', asyncHandler(chatDocument));
router.post('/:id/analyze', asyncHandler(analyzeDocument));
router.get('/:id', asyncHandler(getDocument));
router.post('/', ...uploadHandlers);
router.post('/upload', ...uploadHandlers);

export default router;
