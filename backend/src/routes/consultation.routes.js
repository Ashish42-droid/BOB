import { Router } from 'express';
import {
  scheduleConsultation,
  getConsultations,
  joinConsultation,
  declineConsultation,
  createConsultation,
  startConsultation,
  endConsultation,
  pushToDoctor
} from '../controllers/consultation.controller.js';
import { authenticateUser } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateUser);

router.post('/push-to-doctor', pushToDoctor);
router.post('/schedule', scheduleConsultation);
router.get('/', getConsultations);
router.post('/:id/join', joinConsultation);
router.post('/:id/decline', declineConsultation);

router.post('/', createConsultation);
router.post('/:id/start', startConsultation);
router.post('/:id/end', endConsultation);

export default router;
