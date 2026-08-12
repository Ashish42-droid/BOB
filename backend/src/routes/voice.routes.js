import { Router } from 'express';
import multer from 'multer';
import { transcribeSpeech } from '../controllers/ai.controller.js';
import { authenticateUser } from '../middleware/auth.middleware.js';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.use(authenticateUser);

// Voice routes matching /api/voice/transcribe
router.post('/transcribe', upload.single('audio'), transcribeSpeech);

export default router;
