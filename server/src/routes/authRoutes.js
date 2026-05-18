import express from 'express';
import authController from '../controllers/authController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { uploadAvatar } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

router.post('/register', authController.register);
router.post('/register-with-avatar', uploadAvatar.single('image'), authController.registerWithAvatar);
router.post('/login', authController.login);
router.post('/google', authController.loginWithGoogle);
router.get('/me', requireAuth, authController.me);
router.patch('/me/avatar', requireAuth, uploadAvatar.single('image'), authController.uploadMyAvatar);
router.patch('/me/onboarding', requireAuth, authController.completeOnboarding);

export default router;
