import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { authenticate } from '../../common/middleware/auth.middleware.js';

const router = Router();

router.post('/login', AuthController.login);
router.post('/register', AuthController.register);
router.get('/me', authenticate, AuthController.getMe);
router.post('/logout', authenticate, AuthController.logout);

export default router;
