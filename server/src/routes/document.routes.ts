import { Router } from 'express';
import {
  listDocuments,
  serveDocumentFile,
  uploadDocument,
} from '../controllers/document.controller.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { handleUploadError, upload } from '../middleware/upload.middleware.js';

const router = Router();

const uploadHandlers = [
  upload.single('file'),
  handleUploadError,
  asyncHandler(uploadDocument),
] as const;

router.get('/', asyncHandler(listDocuments));
router.get('/:id/file', asyncHandler(serveDocumentFile));
router.post('/', ...uploadHandlers);
router.post('/upload', ...uploadHandlers);

export default router;
