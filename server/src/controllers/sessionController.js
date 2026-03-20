import { sessionService } from '../services/sessionService.js';

export const sessionController = {
  async getUnreadCounts(req, res, next) {
    try {
      const data = await sessionService.getUnreadCounts({
        senderRole: req.user.role,
        senderName: req.user.fullName
      });
      res.json({
        message: 'Unread counts fetched successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  },

  async getSessions(_req, res, next) {
    try {
      const sessions = await sessionService.getSessions();
      res.json({
        message: 'Sessions fetched successfully',
        count: sessions.length,
        data: sessions
      });
    } catch (error) {
      next(error);
    }
  },

  async getSession(req, res, next) {
    try {
      const session = await sessionService.getSessionById(req.params.id);
      res.json({
        message: 'Session fetched successfully',
        data: session
      });
    } catch (error) {
      next(error);
    }
  },

  async createSession(req, res, next) {
    try {
      const result = await sessionService.createSession(req.body);
      res.status(result.created ? 201 : 200).json({
        message: result.created ? 'Session created successfully' : 'Session already exists, opened existing session',
        data: result.session,
        meta: {
          created: result.created
        }
      });
    } catch (error) {
      next(error);
    }
  },

  async updateStatus(req, res, next) {
    try {
      const session = await sessionService.updateSessionStatus(req.params.id, req.body.status);
      res.json({
        message: 'Session status updated successfully',
        data: session
      });
    } catch (error) {
      next(error);
    }
  },

  async getMessages(req, res, next) {
    try {
      const messages = await sessionService.getMessages(req.params.id);
      res.json({
        message: 'Session messages fetched successfully',
        count: messages.length,
        data: messages
      });
    } catch (error) {
      next(error);
    }
  },

  async createMessage(req, res, next) {
    try {
      const payload = {
        ...req.body,
        senderRole: req.user.role,
        senderName: req.user.fullName
      };
      const message = await sessionService.createMessage(req.params.id, payload);
      res.status(201).json({
        message: 'Message sent successfully',
        data: message
      });
    } catch (error) {
      next(error);
    }
  },

  async markSessionRead(req, res, next) {
    try {
      const data = await sessionService.markSessionRead(req.params.id, {
        senderRole: req.user.role,
        senderName: req.user.fullName
      });
      res.json({
        message: 'Session marked as read',
        data
      });
    } catch (error) {
      next(error);
    }
  }
};
