import { Router } from 'express';
import { doubtController } from '../controllers/doubtController.js';
import { sessionController } from '../controllers/sessionController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', doubtController.getDoubts);
router.get('/:id/matches', doubtController.getMatchedExperts);
router.patch('/:id/assign', requireRole('student'), doubtController.assignExpert);
router.patch('/:id/assignments', requireRole('student'), (req, res, next) => {
	req.body.expertId = req.body.expertId || req.body.assignedToUserId;
	return doubtController.assignExpert(req, res, next);
});
router.post('/', requireRole('student', 'expert'), doubtController.createDoubt);
router.post('/:id/sessions', requireRole('student'), (req, res, next) => {
	req.body = {
		...req.body,
		doubtId: Number(req.params.id)
	};
	return sessionController.createSession(req, res, next);
});
router.delete('/:id', requireRole('student'), doubtController.deleteDoubt);

export default router;
