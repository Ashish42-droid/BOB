import { Router } from 'express';
import multer from 'multer';
import { uploadDocument, runOCR, verifyDocumentExtraction } from '../controllers/document.controller.js';
import { authenticateUser, authorizeRoles } from '../middleware/auth.middleware.js';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.use(authenticateUser);

// Flexible multer middleware that accepts any field name ('document', 'file', etc.)
const flexibleUpload = (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) {
      console.error('Multer upload error:', err.message);
      return res.status(400).json({ error: 'File upload parse error', details: err.message });
    }
    if (req.files && req.files.length > 0) {
      req.file = req.files[0];
    }
    next();
  });
};

router.post('/upload', authorizeRoles('CLINIC_ASSISTANT', 'ADMIN'), flexibleUpload, uploadDocument);
router.post('/:id/ocr', authorizeRoles('CLINIC_ASSISTANT', 'DOCTOR', 'ADMIN'), runOCR);
router.post('/:id/verify', authorizeRoles('CLINIC_ASSISTANT', 'DOCTOR', 'ADMIN'), verifyDocumentExtraction);

export default router;
