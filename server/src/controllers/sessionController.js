import { sessionService } from '../services/sessionService.js';
import { userRepository } from '../repositories/userRepository.js';
import { mailService } from '../services/mailService.js';

function toIdentityKey(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
}

function emitSessionLifecycleEvent(req, eventName, session, actor, extra = {}) {
  const io = req.app.get('io');
  if (!io || !session?.id) return;

  const payload = {
    sessionId: session.id,
    session,
    actor: actor
      ? {
          id: actor.id,
          fullName: actor.fullName,
          role: actor.role
        }
      : null,
    ...extra
  };

  io.to(`session:${session.id}`).emit(eventName, payload);

  const expertUserId = Number(session?.expert?.userId);
  if (Number.isInteger(expertUserId) && expertUserId > 0) {
    io.to(`user:${expertUserId}`).emit(eventName, payload);
  }

  const expertNameKey = toIdentityKey(session?.expert?.fullName);
  if (expertNameKey) {
    io.to(`identity:expert:${expertNameKey}`).emit(eventName, payload);
  }

  const requesterUserId = Number(session?.doubt?.requesterUserId);
  if (Number.isInteger(requesterUserId) && requesterUserId > 0) {
    io.to(`user:${requesterUserId}`).emit(eventName, payload);
  }

  const requesterNameKey = toIdentityKey(session?.doubt?.requesterName);
  if (requesterNameKey) {
    io.to(`identity:student:${requesterNameKey}`).emit(eventName, payload);
  }
}

export const sessionController = {
  async getUnreadCounts(req, res, next) {
    try {
      const data = await sessionService.getUnreadCounts({
        senderRole: req.user.role,
        senderName: req.user.fullName
      }, req.user);
      res.json({
        message: 'Unread counts fetched successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  },

  async getSessions(req, res, next) {
    try {
      const sessions = await sessionService.getSessions(req.user);
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
      const session = await sessionService.getSessionById(req.params.id, req.user);
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
      const result = await sessionService.createSession(req.body, req.user);
      emitSessionLifecycleEvent(req, 'session_request_created', result.session, req.user, {
        created: result.created
      });
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
      const session = await sessionService.updateSessionStatus(req.params.id, req.body.status, req.user);
      emitSessionLifecycleEvent(req, 'session_status_updated', session, req.user);
      res.json({
        message: 'Session status updated successfully',
        data: session
      });
    } catch (error) {
      next(error);
    }
  },

  async respondToRequest(req, res, next) {
    try {
      let session = await sessionService.respondToSessionRequest(req.params.id, req.body.decision, req.user);

      const normalizedDecision = String(req.body.decision || '').trim().toLowerCase();

      if (normalizedDecision === 'accept') {
        const requesterUserId = Number(session?.doubt?.requesterUserId);
        if (Number.isInteger(requesterUserId) && requesterUserId > 0) {
          const studentUser = await userRepository.findById(requesterUserId);
          if (studentUser?.email) {
            await mailService.sendStudentRequestAccepted({
              studentEmail: studentUser.email,
              studentName: studentUser.fullName,
              expertName: req.user.fullName,
              doubtTitle: session?.doubt?.title,
              sessionId: session.id
            });
          }
        }
      }

      emitSessionLifecycleEvent(req, 'session_request_responded', session, req.user, {
        decision: req.body.decision
      });
      res.json({
        message: 'Session request response saved successfully',
        data: session
      });
    } catch (error) {
      next(error);
    }
  },

  async getMessages(req, res, next) {
    try {
      const messages = await sessionService.getMessages(req.params.id, req.user);
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
      const message = await sessionService.createMessage(req.params.id, payload, req.user);
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
      }, req.user);
      res.json({
        message: 'Session marked as read',
        data
      });
    } catch (error) {
      next(error);
    }
  },

  async getSessionRating(req, res, next) {
    try {
      const rating = await sessionService.getSessionRating(req.params.id, req.user);
      res.json({
        message: 'Session rating fetched successfully',
        data: rating
      });
    } catch (error) {
      next(error);
    }
  },

  async getSessionBilling(req, res, next) {
    try {
      const billing = await sessionService.getSessionBilling(req.params.id, req.user);
      res.json({
        message: 'Session billing fetched successfully',
        data: billing
      });
    } catch (error) {
      next(error);
    }
  },

  async submitSessionRating(req, res, next) {
    try {
      const rating = await sessionService.submitSessionRating(req.params.id, req.body, req.user);
      res.status(201).json({
        message: 'Session rating saved successfully',
        data: rating
      });
    } catch (error) {
      next(error);
    }
  },

  async checkAndActivateSession(req, res, next) {
    try {
      const session = await sessionService.checkAndActivateSession(req.params.id);
      res.json({
        message: 'Session status checked and activated if ready',
        data: session
      });
    } catch (error) {
      next(error);
    }
  }
};
