import { Router } from 'express';
import { sessionController } from '../controllers/sessionController.js';

const router = Router();

router.get('/', sessionController.getSessions);
router.post('/', sessionController.createSession);
router.get('/:id', sessionController.getSession);
router.patch('/:id/status', sessionController.updateStatus);
router.get('/:id/messages', sessionController.getMessages);
router.post('/:id/messages', sessionController.createMessage);

export default router;
