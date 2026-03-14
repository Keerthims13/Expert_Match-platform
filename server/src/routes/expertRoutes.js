import { Router } from 'express';
import { expertController } from '../controllers/expertController.js';

const router = Router();

router.get('/', expertController.getExpertList);
router.post('/profile', expertController.createExpertProfile);
router.delete('/:identifier', expertController.deleteExpertProfile);
router.get('/:identifier', expertController.getExpertProfile);

export default router;
