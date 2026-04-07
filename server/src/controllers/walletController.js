import { walletService } from '../services/walletService.js';

export const walletController = {
  async getConfig(_req, res, next) {
    try {
      const data = walletService.getClientConfig();
      res.json({
        message: 'Wallet config fetched successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  },

  async getMyWallet(req, res, next) {
    try {
      const data = await walletService.getWalletOverview(req.user);
      res.json({
        message: 'Wallet fetched successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  },

  async createTopupOrder(req, res, next) {
    try {
      const data = await walletService.createTopupOrder(req.body.amount, req.user);
      res.status(201).json({
        message: 'Top-up order created successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  },

  async verifyTopup(req, res, next) {
    try {
      const data = await walletService.verifyTopupPayment(req.body, req.user);
      res.json({
        message: 'Top-up verified successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  },

  async getMyBillings(req, res, next) {
    try {
      const data = await walletService.listMyBillings(req.user);
      res.json({
        message: 'Billings fetched successfully',
        count: data.length,
        data
      });
    } catch (error) {
      next(error);
    }
  }
};
