import { Router } from 'express';
import {
  createConsultation,
  startConsultation,
  endConsultation
} from '../controllers/consultation.controller.js';
import { authenticateUser } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateUser);

router.post('/', createConsultation);
router.post('/:id/start', startConsultation);
router.post('/:id/end', endConsultation);

export default router;
