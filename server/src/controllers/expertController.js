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
      const profile = await expertService.createExpertProfile(req.body);

      res.status(201).json({
        message: 'Expert profile created successfully',
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
