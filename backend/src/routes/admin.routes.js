import { Router } from 'express';
import {
  getUsers,
  createUser,
  getProtocols,
  createProtocol,
  getAuditLogs,
  getAnalytics
} from '../controllers/admin.controller.js';
import { authenticateUser, authorizeRoles } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateUser);
router.use(authorizeRoles('ADMIN'));

router.get('/users', getUsers);
router.post('/users', createUser);

router.get('/protocols', getProtocols);
router.post('/protocols', createProtocol);

router.get('/audit', getAuditLogs);
router.get('/analytics', getAnalytics);

export default router;
