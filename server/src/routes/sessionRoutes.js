import { Router } from 'express';
import { sessionController } from '../controllers/sessionController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/unread', sessionController.getUnreadCounts);
router.get('/', sessionController.getSessions);
router.post('/', sessionController.createSession);
router.get('/:id', sessionController.getSession);
router.patch('/:id/status', sessionController.updateStatus);
router.patch('/:id/read', sessionController.markSessionRead);
router.get('/:id/messages', sessionController.getMessages);
router.post('/:id/messages', sessionController.createMessage);

export default router;
