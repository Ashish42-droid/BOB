import { Router } from 'express';
import {
  createPatient,
  getPatients,
  getPatientById,
  getPatientHistory
} from '../controllers/patient.controller.js';
import { authenticateUser, authorizeRoles } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateUser);

router.post('/', authorizeRoles('CLINIC_ASSISTANT', 'ADMIN'), createPatient);
router.get('/', authorizeRoles('CLINIC_ASSISTANT', 'DOCTOR', 'ADMIN'), getPatients);
router.get('/:id', authorizeRoles('CLINIC_ASSISTANT', 'DOCTOR', 'ADMIN'), getPatientById);
router.get('/:id/history', authorizeRoles('CLINIC_ASSISTANT', 'DOCTOR', 'ADMIN'), getPatientHistory);

export default router;
