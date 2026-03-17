import { Router } from 'express';
import { doubtController } from '../controllers/doubtController.js';

const router = Router();

router.get('/', doubtController.getDoubts);
router.get('/:id/matches', doubtController.getMatchedExperts);
router.patch('/:id/assign', doubtController.assignExpert);
router.post('/', doubtController.createDoubt);
router.delete('/:id', doubtController.deleteDoubt);

export default router;
