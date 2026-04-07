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

  async registerWithAvatar(req, res, next) {
    try {
      const profileImageUrl = req.file
        ? `${req.protocol}://${req.get('host')}/uploads/avatars/${req.file.filename}`
        : '';

      const payload = {
        ...req.body,
        profileImageUrl
      };

      const data = await authService.register(payload);
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

  async googleLogin(req, res, next) {
    try {
      const data = await authService.loginWithGoogle(req.body);
      res.json({
        message: 'Google login successful',
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
  },

  async listUsers(_req, res, next) {
    try {
      const data = await authService.listUsers();
      res.json({
        message: 'Users fetched successfully',
        count: data.length,
        data
      });
    } catch (error) {
      next(error);
    }
  },

  async uploadMyAvatar(req, res, next) {
    try {
      if (!req.file) {
        const error = new Error('Image file is required');
        error.status = 400;
        throw error;
      }

      const profileImageUrl = `${req.protocol}://${req.get('host')}/uploads/avatars/${req.file.filename}`;
      const data = await authService.updateMyProfileImage(req.user.id, profileImageUrl);

      res.json({
        message: 'Profile image updated successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }
};
