import { doubtRepository } from '../repositories/doubtRepository.js';
import { expertRepository } from '../repositories/expertRepository.js';
import { sessionRepository } from '../repositories/sessionRepository.js';
import { walletService } from './walletService.js';

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

class ForbiddenError extends Error {
  constructor(message) {
    super(message);
    this.status = 403;
  }
}

function toPositiveInt(value, label) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    throw new BadRequestError(`${label} must be a positive integer`);
  }
  return numeric;
}

function normalizeParticipant(input) {
  const senderRole = String(input?.senderRole || '').trim().toLowerCase();
  const senderName = String(input?.senderName || '').trim();

  if (!['student', 'expert', 'system'].includes(senderRole)) {
    throw new BadRequestError('senderRole must be student, expert, or system');
  }

  if (!senderName) {
    throw new BadRequestError('senderName is required');
  }

  return { senderRole, senderName };
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

export const sessionService = {
  async getSessions(actor = null) {
    const sessions = await sessionRepository.findAllSessions();
    if (!actor) return sessions;

    return sessions.filter((session) => {
      if (actor.role === 'expert') {
        const byUserId = Number(session.expert.userId) === Number(actor.id);
        const byName = normalizeName(session.expert.fullName) === normalizeName(actor.fullName);
        return byUserId || byName;
      }

      const byUserId = Number(session.doubt.requesterUserId) === Number(actor.id);
      const byName = normalizeName(session.doubt.requesterName) === normalizeName(actor.fullName);
      return byUserId || byName;
    });
  },

  async getSessionById(id, actor = null) {
    const sessionId = toPositiveInt(id, 'sessionId');
    const session = await sessionRepository.findSessionById(sessionId);
    if (!session) {
      throw new NotFoundError('Session not found');
    }

    if (actor) {
      const canAccess = actor.role === 'expert'
        ? (Number(session.expert.userId) === Number(actor.id)
          || normalizeName(session.expert.fullName) === normalizeName(actor.fullName))
        : (Number(session.doubt.requesterUserId) === Number(actor.id)
          || normalizeName(session.doubt.requesterName) === normalizeName(actor.fullName));

      if (!canAccess) {
        throw new ForbiddenError('Forbidden: you are not a participant of this session');
      }
    }

    return session;
  },

  async createSession(input, actor = null) {
    const doubtId = toPositiveInt(input.doubtId, 'doubtId');

    const doubt = await doubtRepository.findById(doubtId);
    if (!doubt) {
      throw new NotFoundError('Doubt not found');
    }

    const expertId = input.expertId ? toPositiveInt(input.expertId, 'expertId') : Number(doubt.assignedExpertId);

    if (!Number.isInteger(expertId) || expertId <= 0) {
      throw new BadRequestError('Assigned expert is required before starting session');
    }

    const expert = await expertRepository.resolveByIdOrUserId(expertId);
    if (!expert) {
      throw new NotFoundError('Assigned expert not found');
    }

    if (!Number.isInteger(Number(expert.userId)) || Number(expert.userId) <= 0) {
      const error = new Error('Selected expert has not set up their account properly. Please ask them to complete their expert profile setup before starting a chat.');
      error.status = 400;
      throw error;
    }

    if (actor && actor.role === 'student') {
      const ownerById = Number(doubt.requesterUserId) === Number(actor.id);
      const ownerByName = normalizeName(doubt.requesterName) === normalizeName(actor.fullName);
      if (!ownerById && !ownerByName) {
        throw new ForbiddenError('Only the student who created this doubt can start a chat request.');
      }
    }

    const existing = await sessionRepository.findSessionByDoubtId(doubtId);
    if (existing) {
      if (['declined', 'cancelled'].includes(String(existing.status || '').toLowerCase())) {
        const reopened = await sessionRepository.markSessionRequested(
          existing.id,
          'Student requested to start a chat session again.'
        );
        return {
          session: reopened,
          created: false
        };
      }

      return {
        session: existing,
        created: false
      };
    }

    const session = await sessionRepository.createSession({
      doubtId,
      expertId,
      requestMessage: 'Student requested to start a chat session.'
    });
    return {
      session,
      created: true
    };
  },

  async respondToSessionRequest(id, decision, actor = null) {
    const sessionId = toPositiveInt(id, 'sessionId');
    const normalizedDecision = String(decision || '').trim().toLowerCase();

    if (!['accept', 'decline'].includes(normalizedDecision)) {
      throw new BadRequestError('decision must be accept or decline');
    }

    const session = await this.getSessionById(sessionId, actor);
    if (session.status !== 'requested') {
      throw new BadRequestError('Session request is not pending');
    }

    if (!actor) {
      throw new ForbiddenError('Forbidden');
    }

    const expertById = Number(session.expert.userId) === Number(actor.id);
    const expertByName = normalizeName(session.expert.fullName) === normalizeName(actor.fullName);
    if (!expertById && !expertByName) {
      throw new ForbiddenError('Forbidden: only assigned expert can respond to chat request');
    }

    const nextStatus = normalizedDecision === 'accept' ? 'accepted_pending' : 'declined';
    const updated = await sessionRepository.updateSessionStatus(sessionId, nextStatus);
    if (!updated) {
      throw new NotFoundError('Session not found');
    }

    return updated;
  },

  async updateSessionStatus(id, status, actor = null) {
    const sessionId = toPositiveInt(id, 'sessionId');
    const normalized = String(status || '').trim().toLowerCase();

    if (!['completed', 'cancelled'].includes(normalized)) {
      throw new BadRequestError('status must be completed or cancelled');
    }

    if (!actor) {
      throw new ForbiddenError('Forbidden');
    }

    const session = await this.getSessionById(sessionId, actor);
    const isExpertParticipant = Number(session.expert.userId) === Number(actor.id)
      || normalizeName(session.expert.fullName) === normalizeName(actor.fullName);
    const isStudentParticipant = Number(session.doubt.requesterUserId) === Number(actor.id)
      || normalizeName(session.doubt.requesterName) === normalizeName(actor.fullName);

    if (!isExpertParticipant && !isStudentParticipant) {
      throw new ForbiddenError('Forbidden: only session participants can end chat');
    }

    const updated = await sessionRepository.updateSessionStatus(sessionId, normalized, {
      endedByRole: actor.role,
      endedByName: actor.fullName
    });
    if (!updated) {
      throw new NotFoundError('Session not found');
    }

    if (normalized === 'completed') {
      try {
        const billing = await walletService.settleSessionCharge(updated);
        updated.billing = billing;
      } catch (billingError) {
        updated.billing = {
          sessionId: updated.id,
          status: 'failed',
          amountDue: 0,
          amountCharged: 0,
          notes: billingError.message || 'Billing failed'
        };
      }
    }

    return updated;
  },

  async getMessages(id, actor = null) {
    const sessionId = toPositiveInt(id, 'sessionId');
    await this.getSessionById(sessionId, actor);
    return sessionRepository.findMessagesBySessionId(sessionId);
  },

  async createMessage(id, input, actor = null) {
    const sessionId = toPositiveInt(id, 'sessionId');
    const session = await this.getSessionById(sessionId, actor);

    if (session.status !== 'active') {
      throw new ForbiddenError('Chat is not active. Please wait for expert approval or start a new request.');
    }

    const chatBudget = await walletService.getSessionChatBudget(session);
    const minimumChatBalance = walletService.getMinimumChatWalletBalance();

    if (chatBudget.balance < minimumChatBalance || chatBudget.amountDue > chatBudget.balance) {
      const closedSession = await sessionRepository.updateSessionStatus(sessionId, 'completed', {
        endedByRole: 'system',
        endedByName: 'Wallet limit reached'
      });

      if (closedSession) {
        try {
          closedSession.billing = await walletService.settleSessionCharge(closedSession);
        } catch (billingError) {
          closedSession.billing = {
            sessionId: closedSession.id,
            status: 'failed',
            amountDue: 0,
            amountCharged: 0,
            notes: billingError.message || 'Billing failed'
          };
        }
      }

      throw new BadRequestError(
        chatBudget.balance < minimumChatBalance
          ? 'Minimum wallet balance of Rs 100 is required to chat. Please top up your wallet.'
          : 'Your wallet balance is not enough to continue this chat. The session has been closed and the available amount has been paid to the expert.'
      );
    }

    if (session.startedAt) {
      const startAtMs = new Date(session.startedAt).getTime();
      if (Number.isFinite(startAtMs) && Date.now() < startAtMs) {
        throw new ForbiddenError('Chat will start in a few seconds once both participants are ready.');
      }
    }

    const { senderRole, senderName } = normalizeParticipant(input);
    const message = String(input.message || '').trim();

    if (!message) {
      throw new BadRequestError('message is required');
    }

    if (actor) {
      if (String(actor.role).toLowerCase() !== senderRole) {
        throw new ForbiddenError('Forbidden: senderRole must match authenticated user role');
      }
      if (String(actor.fullName || '').trim() !== senderName) {
        throw new ForbiddenError('Forbidden: senderName must match authenticated user');
      }
    }

    const created = await sessionRepository.createMessage({
      sessionId,
      senderRole,
      senderName,
      message
    });

    // A sender has read up to their own latest message.
    await sessionRepository.upsertParticipant(sessionId, senderRole, senderName);
    return created;
  },

  async markMessageDelivered(messageId) {
    const numericMessageId = toPositiveInt(messageId, 'messageId');
    return sessionRepository.markMessageDelivered(numericMessageId);
  },

  async getUnreadCounts(input, actor = null) {
    const { senderRole, senderName } = normalizeParticipant(input);
    if (actor) {
      if (String(actor.role).toLowerCase() !== senderRole || String(actor.fullName || '').trim() !== senderName) {
        throw new ForbiddenError('Forbidden');
      }
    }
    const counts = await sessionRepository.findUnreadCountsByParticipant(senderRole, senderName);

    return counts.reduce((acc, item) => {
      acc[item.sessionId] = item.unreadCount;
      return acc;
    }, {});
  },

  async markSessionRead(id, input, actor = null) {
    const sessionId = toPositiveInt(id, 'sessionId');
    await this.getSessionById(sessionId, actor);

    const { senderRole, senderName } = normalizeParticipant(input);
    if (actor) {
      if (String(actor.role).toLowerCase() !== senderRole || String(actor.fullName || '').trim() !== senderName) {
        throw new ForbiddenError('Forbidden');
      }
    }
    await sessionRepository.markSessionReadForParticipant(sessionId, senderRole, senderName);
    const seenMessageIds = await sessionRepository.markMessagesSeenForParticipant(sessionId, senderRole, senderName);

    return {
      sessionId,
      senderRole,
      senderName,
      seenMessageIds,
      markedAt: new Date().toISOString()
    };
  },

  async markAllPendingMessagesSeen(id) {
    const sessionId = toPositiveInt(id, 'sessionId');
    const session = await sessionRepository.findSessionById(sessionId);
    if (!session) {
      throw new NotFoundError('Session not found');
    }

    const seenMessageIds = await sessionRepository.markAllPendingMessagesSeenInSession(sessionId);
    return {
      sessionId,
      seenMessageIds,
      markedAt: new Date().toISOString()
    };
  },

  async scheduleSessionStart(id) {
    const sessionId = toPositiveInt(id, 'sessionId');
    const session = await sessionRepository.findSessionById(sessionId);
    if (!session) {
      throw new NotFoundError('Session not found');
    }
    const currentStatus = String(session.status || '').toLowerCase();
    if (!['accepted_pending', 'active'].includes(currentStatus)) {
      return session;
    }

    const chatBudget = await walletService.getSessionChatBudget(session);
    if (chatBudget.balance < walletService.getMinimumChatWalletBalance()) {
      throw new BadRequestError('Minimum wallet balance of Rs 100 is required to start chat. Please top up your wallet.');
    }

    return sessionRepository.scheduleSessionStart(sessionId);
  },

  async getSessionRating(id, actor = null) {
    const sessionId = toPositiveInt(id, 'sessionId');
    await this.getSessionById(sessionId, actor);
    return sessionRepository.findSessionRating(sessionId);
  },

  async getSessionBilling(id, actor = null) {
    const sessionId = toPositiveInt(id, 'sessionId');
    const session = await this.getSessionById(sessionId, actor);
    return walletService.getSessionBillingForUser(session, actor);
  },

  async submitSessionRating(id, input, actor = null) {
    const sessionId = toPositiveInt(id, 'sessionId');
    if (!actor) {
      throw new ForbiddenError('Forbidden');
    }

    if (String(actor.role || '').toLowerCase() !== 'student') {
      throw new ForbiddenError('Only students can submit session rating');
    }

    const session = await this.getSessionById(sessionId, actor);
    if (String(session.status || '').toLowerCase() !== 'completed') {
      throw new BadRequestError('Rating is allowed only after session is completed');
    }

    const rating = Number(input?.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestError('rating must be an integer between 1 and 5');
    }

    const reviewText = String(input?.reviewText || '').trim();
    if (reviewText.length > 500) {
      throw new BadRequestError('reviewText must be at most 500 characters');
    }

    return sessionRepository.upsertSessionRating({
      sessionId,
      expertId: session.expertId,
      studentUserId: actor.id,
      rating,
      reviewText
    });
  },

  async checkAndActivateSession(sessionId) {
    const session = await this.getSessionById(sessionId);
    return session;
  }
};
