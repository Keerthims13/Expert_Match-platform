import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { uploadAvatar } from '../middlewares/uploadMiddleware.js';

const router = Router();

router.post('/register', authController.register);
router.post('/register-with-avatar', uploadAvatar.single('image'), authController.registerWithAvatar);
router.post('/login', authController.login);
router.post('/google', authController.googleLogin);
router.get('/users', requireAuth, authController.listUsers);
router.get('/me', requireAuth, authController.me);
router.patch('/me/avatar', requireAuth, uploadAvatar.single('image'), authController.uploadMyAvatar);

export default router;
