import { Router } from 'express';
import { login, register, logout, getMe } from '../controllers/auth.controller.js';
import { authenticateUser } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.post('/logout', authenticateUser, logout);
router.get('/me', authenticateUser, getMe);

export default router;
