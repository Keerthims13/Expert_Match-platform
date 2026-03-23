import { Router } from 'express';
import { doubtController } from '../controllers/doubtController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', doubtController.getDoubts);
router.get('/:id/matches', doubtController.getMatchedExperts);
router.patch('/:id/assign', requireRole('student'), doubtController.assignExpert);
router.post('/', requireRole('student', 'expert'), doubtController.createDoubt);
router.delete('/:id', requireRole('student'), doubtController.deleteDoubt);

export default router;
