import { doubtRepository } from '../repositories/doubtRepository.js';
import { sessionRepository } from '../repositories/sessionRepository.js';

class BadRequestError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.status = 404;
  }
}

function toPositiveInt(value, label) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    throw new BadRequestError(`${label} must be a positive integer`);
  }
  return numeric;
}

export const sessionService = {
  async getSessions() {
    return sessionRepository.findAllSessions();
  },

  async getSessionById(id) {
    const sessionId = toPositiveInt(id, 'sessionId');
    const session = await sessionRepository.findSessionById(sessionId);
    if (!session) {
      throw new NotFoundError('Session not found');
    }
    return session;
  },

  async createSession(input) {
    const doubtId = toPositiveInt(input.doubtId, 'doubtId');

    const doubt = await doubtRepository.findById(doubtId);
    if (!doubt) {
      throw new NotFoundError('Doubt not found');
    }

    const expertId = input.expertId ? toPositiveInt(input.expertId, 'expertId') : Number(doubt.assignedExpertId);

    if (!Number.isInteger(expertId) || expertId <= 0) {
      throw new BadRequestError('Assigned expert is required before starting session');
    }

    const existing = await sessionRepository.findSessionByDoubtId(doubtId);
    if (existing) {
      return {
        session: existing,
        created: false
      };
    }

    const session = await sessionRepository.createSession({ doubtId, expertId });
    return {
      session,
      created: true
    };
  },

  async updateSessionStatus(id, status) {
    const sessionId = toPositiveInt(id, 'sessionId');
    const normalized = String(status || '').trim().toLowerCase();

    if (!['active', 'completed', 'cancelled'].includes(normalized)) {
      throw new BadRequestError('status must be active, completed, or cancelled');
    }

    const updated = await sessionRepository.updateSessionStatus(sessionId, normalized);
    if (!updated) {
      throw new NotFoundError('Session not found');
    }

    return updated;
  },

  async getMessages(id) {
    const sessionId = toPositiveInt(id, 'sessionId');
    const session = await sessionRepository.findSessionById(sessionId);
    if (!session) {
      throw new NotFoundError('Session not found');
    }
    return sessionRepository.findMessagesBySessionId(sessionId);
  },

  async createMessage(id, input) {
    const sessionId = toPositiveInt(id, 'sessionId');
    const session = await sessionRepository.findSessionById(sessionId);
    if (!session) {
      throw new NotFoundError('Session not found');
    }

    const senderRole = String(input.senderRole || '').trim().toLowerCase();
    const senderName = String(input.senderName || '').trim();
    const message = String(input.message || '').trim();

    if (!['student', 'expert', 'system'].includes(senderRole)) {
      throw new BadRequestError('senderRole must be student, expert, or system');
    }

    if (!senderName) {
      throw new BadRequestError('senderName is required');
    }

    if (!message) {
      throw new BadRequestError('message is required');
    }

    return sessionRepository.createMessage({
      sessionId,
      senderRole,
      senderName,
      message
    });
  }
};
