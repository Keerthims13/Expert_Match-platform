import { Router } from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { createReport } from '../controllers/reportController.js';

const router = Router();

router.use(requireAuth);
router.post('/', createReport);

export default router;
