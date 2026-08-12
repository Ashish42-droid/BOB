import { Router } from 'express';
import {
  getDoctorQueue,
  getDoctorCaseDetails,
  recordDoctorReview,
  referPatientToHospital
} from '../controllers/doctor.controller.js';
import { authenticateUser, authorizeRoles } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateUser);

router.get('/queue', authorizeRoles('DOCTOR', 'ADMIN'), getDoctorQueue);
router.get('/cases/:id', authorizeRoles('DOCTOR', 'ADMIN'), getDoctorCaseDetails);
router.post('/cases/:id/review', authorizeRoles('DOCTOR'), recordDoctorReview);
router.post('/cases/:id/refer', authorizeRoles('DOCTOR'), referPatientToHospital);

export default router;
