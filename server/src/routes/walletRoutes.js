import { Router } from 'express';
import { walletController } from '../controllers/walletController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/config', walletController.getConfig);
router.use(requireAuth);
router.get('/me', walletController.getMyWallet);
router.get('/billings', walletController.getMyBillings);
router.post('/topup/create-order', walletController.createTopupOrder);
router.post('/topup/verify', walletController.verifyTopup);

export default router;
