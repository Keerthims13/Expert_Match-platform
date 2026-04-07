import { Router } from 'express';
import { sessionController } from '../controllers/sessionController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/unread', sessionController.getUnreadCounts);
router.get('/', sessionController.getSessions);
router.post('/', requireRole('student'), sessionController.createSession);
router.get('/:id', sessionController.getSession);
router.patch('/:id/respond', sessionController.respondToRequest);
router.patch('/:id/response', sessionController.respondToRequest);
router.patch('/:id/check-activate', sessionController.checkAndActivateSession);
router.patch('/:id/status', sessionController.updateStatus);
router.patch('/:id/read', sessionController.markSessionRead);
router.get('/:id/rating', sessionController.getSessionRating);
router.get('/:id/billing', sessionController.getSessionBilling);
router.post('/:id/rating', requireRole('student'), sessionController.submitSessionRating);
router.get('/:id/messages', sessionController.getMessages);
router.post('/:id/messages', sessionController.createMessage);

export default router;
