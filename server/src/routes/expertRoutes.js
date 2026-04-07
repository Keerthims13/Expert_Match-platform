import { Router } from 'express';
import { expertController } from '../controllers/expertController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';
import { uploadAvatar } from '../middlewares/uploadMiddleware.js';

const router = Router();

router.get('/', expertController.getExpertList);
router.get('/me', requireAuth, requireRole('expert'), expertController.getMyExpertProfile);
router.patch('/me/availability', requireAuth, requireRole('expert'), expertController.updateMyAvailability);
router.patch('/me/avatar', requireAuth, requireRole('expert'), uploadAvatar.single('image'), expertController.uploadMyAvatar);
router.post('/profile', requireAuth, requireRole('expert'), expertController.createExpertProfile);
router.delete('/:identifier', requireAuth, requireRole('expert'), expertController.deleteExpertProfile);
router.get('/:identifier', expertController.getExpertProfile);

export default router;
