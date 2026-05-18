import { doubtService } from '../services/doubtService.js';
import { sessionService } from '../services/sessionService.js';

function toIdentityKey(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
}

function emitSessionRequestCreated(req, session, actor, created) {
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
    created: Boolean(created)
  };

  io.to(`session:${session.id}`).emit('session_request_created', payload);

  const expertUserId = Number(session?.expert?.userId);
  if (Number.isInteger(expertUserId) && expertUserId > 0) {
    io.to(`user:${expertUserId}`).emit('session_request_created', payload);
  }

  const expertNameKey = toIdentityKey(session?.expert?.fullName);
  if (expertNameKey) {
    io.to(`identity:expert:${expertNameKey}`).emit('session_request_created', payload);
  }

  const requesterUserId = Number(session?.doubt?.requesterUserId);
  if (Number.isInteger(requesterUserId) && requesterUserId > 0) {
    io.to(`user:${requesterUserId}`).emit('session_request_created', payload);
  }

  const requesterNameKey = toIdentityKey(session?.doubt?.requesterName);
  if (requesterNameKey) {
    io.to(`identity:student:${requesterNameKey}`).emit('session_request_created', payload);
  }
}

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
      const sessionResult = await sessionService.createSession(
        {
          doubtId: Number(doubt.id),
          expertId: Number(doubt.assignedExpertId || req.body.expertId)
        },
        req.user
      );

      emitSessionRequestCreated(req, sessionResult.session, req.user, sessionResult.created);

      res.json({
        message: sessionResult.created
          ? 'Expert assigned and chat request sent successfully'
          : 'Expert assigned. Existing chat request/session opened',
        data: {
          doubt,
          session: sessionResult.session,
          requestCreated: sessionResult.created
        }
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
      const result = await doubtService.createDoubt(payload);
      res.status(201).json({
        message: 'Doubt created successfully',
        data: result
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
  ,

  async updateDoubt(req, res, next) {
    try {
      const payload = req.body || {};
      const updated = await doubtService.updateDoubt(req.params.id, payload, req.user);
      res.json({ message: 'Doubt updated successfully', data: updated });
    } catch (error) {
      next(error);
    }
  }
};
