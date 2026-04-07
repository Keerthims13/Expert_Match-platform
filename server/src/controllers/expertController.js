import { expertService } from '../services/expertService.js';

export const expertController = {
  async getExpertList(_req, res, next) {
    try {
      const experts = await expertService.getExpertList();

      res.json({
        message: 'Expert list fetched successfully',
        count: experts.length,
        data: experts
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteExpertProfile(req, res, next) {
    try {
      const { identifier } = req.params;
      const deleted = await expertService.deleteExpertProfile(identifier);

      res.json({
        message: 'Expert user deleted successfully',
        data: deleted
      });
    } catch (error) {
      next(error);
    }
  },

  async createExpertProfile(req, res, next) {
    try {
      const profile = await expertService.createExpertProfile(req.body, req.user);

      res.status(201).json({
        message: 'Expert profile created successfully',
        data: profile
      });
    } catch (error) {
      next(error);
    }
  },

  async getMyExpertProfile(req, res, next) {
    try {
      const profile = await expertService.getMyExpertProfile(req.user.id);

      res.json({
        message: 'My expert profile fetched successfully',
        data: profile
      });
    } catch (error) {
      next(error);
    }
  },

  async updateMyAvailability(req, res, next) {
    try {
      const profile = await expertService.updateMyAvailability(req.user.id, req.body.availabilityStatus);

      res.json({
        message: 'Availability updated successfully',
        data: profile
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
      const profile = await expertService.updateMyProfileImage(req.user.id, profileImageUrl);

      res.json({
        message: 'Profile image updated successfully',
        data: profile
      });
    } catch (error) {
      next(error);
    }
  },

  async getExpertProfile(req, res, next) {
    try {
      const { identifier } = req.params;
      const profile = await expertService.getExpertProfile(identifier);

      res.json({
        message: 'Expert profile fetched successfully',
        data: profile
      });
    } catch (error) {
      next(error);
    }
  }
};
