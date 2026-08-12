import { Router } from 'express';
import multer from 'multer';
import { uploadDocument, runOCR, verifyDocumentExtraction } from '../controllers/document.controller.js';
import { authenticateUser, authorizeRoles } from '../middleware/auth.middleware.js';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.use(authenticateUser);

router.post('/upload', authorizeRoles('CLINIC_ASSISTANT', 'ADMIN'), upload.single('file'), uploadDocument);
router.post('/:id/ocr', authorizeRoles('CLINIC_ASSISTANT', 'DOCTOR', 'ADMIN'), runOCR);
router.post('/:id/verify', authorizeRoles('CLINIC_ASSISTANT', 'DOCTOR', 'ADMIN'), verifyDocumentExtraction);

export default router;
