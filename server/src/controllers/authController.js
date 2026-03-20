import { authService } from '../services/authService.js';

export const authController = {
  async register(req, res, next) {
    try {
      const data = await authService.register(req.body);
      res.status(201).json({
        message: 'Registered successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  },

  async login(req, res, next) {
    try {
      const data = await authService.login(req.body);
      res.json({
        message: 'Login successful',
        data
      });
    } catch (error) {
      next(error);
    }
  },

  async me(req, res, next) {
    try {
      const data = await authService.me(req.user.id);
      res.json({
        message: 'User fetched successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }
};
