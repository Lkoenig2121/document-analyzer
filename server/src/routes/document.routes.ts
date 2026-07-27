import { Router } from 'express';
import {
  chatDocument,
  createDocument,
  getDocument,
  listDocuments,
  listTopics,
  searchDocuments,
  serveDocumentFile,
} from '../controllers/document.controller.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { handleUploadError, upload } from '../middleware/upload.middleware.js';

const router = Router();

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
router.get('/:id', asyncHandler(getDocument));
router.post('/', ...uploadHandlers);
router.post('/upload', ...uploadHandlers);

export default router;
