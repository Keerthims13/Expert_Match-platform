import { doubtService } from '../services/doubtService.js';

export const doubtController = {
  async getDoubts(req, res, next) {
    try {
      const doubts = await doubtService.getDoubts(req.user);
      res.json({
        message: 'Doubts fetched successfully',
        count: doubts.length,
        data: doubts
      });
    } catch (error) {
      next(error);
    }
  },

  async getMatchedExperts(req, res, next) {
    try {
      const data = await doubtService.getMatchedExperts(req.params.id);
      res.json({
        message: 'Expert matches fetched successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  },

  async assignExpert(req, res, next) {
    try {
      const doubt = await doubtService.assignExpert(req.params.id, req.body.expertId, req.user);
      res.json({
        message: 'Expert assigned to doubt successfully',
        data: doubt
      });
    } catch (error) {
      next(error);
    }
  },

  async createDoubt(req, res, next) {
    try {
      const payload = {
        ...req.body,
        requesterName: req.user?.fullName,
        requesterUserId: req.user?.id
      };
      const doubt = await doubtService.createDoubt(payload);
      res.status(201).json({
        message: 'Doubt created successfully',
        data: doubt
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteDoubt(req, res, next) {
    try {
      const result = await doubtService.deleteDoubt(req.params.id, req.user);
      res.json({
        message: 'Doubt deleted successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
};
