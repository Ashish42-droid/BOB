import { Router } from 'express';
import { createVisit, getVisitById, updateVisit } from '../controllers/visit.controller.js';
import { authenticateUser, authorizeRoles } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateUser);

router.post('/', authorizeRoles('CLINIC_ASSISTANT', 'ADMIN'), createVisit);
router.get('/:id', authorizeRoles('CLINIC_ASSISTANT', 'DOCTOR', 'ADMIN'), getVisitById);
router.patch('/:id', authorizeRoles('CLINIC_ASSISTANT', 'DOCTOR', 'ADMIN'), updateVisit);

export default router;
