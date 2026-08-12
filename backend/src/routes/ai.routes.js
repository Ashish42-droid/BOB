import { Router } from 'express';
import multer from 'multer';
import {
  transcribeSpeech,
  analyzeDocumentAI,
  analyzePatientCase,
  getRiskAssessment,
  analyzeImageAI
} from '../controllers/ai.controller.js';
import { authenticateUser, authorizeRoles } from '../middleware/auth.middleware.js';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.use(authenticateUser);

router.post('/transcribe', upload.single('audio'), transcribeSpeech);
router.post('/analyze-document', upload.single('file'), analyzeDocumentAI);
router.post('/analyze-patient', authorizeRoles('CLINIC_ASSISTANT', 'DOCTOR', 'ADMIN'), analyzePatientCase);
router.post('/risk-assessment', getRiskAssessment);
router.post('/analyze-image', upload.single('image'), analyzeImageAI);

export default router;
