import { doubtRepository } from '../repositories/doubtRepository.js';
import { expertRepository } from '../repositories/expertRepository.js';
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

function extractKeywords(doubt, knownSpecialties) {
  const text = `${doubt.title} ${doubt.description} ${doubt.category}`.toLowerCase();
  const normalizedText = ` ${text.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ')} `;

  const rawTokens = normalizedText
    .trim()
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

  const tokenSet = new Set(rawTokens);

  const skillTokenSet = new Set(
    knownSpecialties
      .flatMap((specialty) => String(specialty || '').toLowerCase().split(/[^a-z0-9]+/))
      .map((token) => token.trim())
      .filter((token) => token.length >= 2)
  );

  const specialtyMatches = knownSpecialties
    .map((specialty) => String(specialty || '').trim().toLowerCase())
    .filter(Boolean)
    .filter((specialty) => normalizedText.includes(` ${specialty} `) || normalizedText.includes(specialty))
    .slice(0, 8);

  const stopWords = new Set([
    'the',
    'for',
    'with',
    'and',
    'this',
    'that',
    'from',
    'need',
    'help',
    'want',
    'using',
    'into',
    'about',
    'have',
    'looking',
    'search',
    'searching',
    'expert',
    'experts',
    'problem',
    'issue',
    'issues',
    'task',
    'project',
    'query',
    'queries',
    'optimize',
    'optimization',
    'please',
    'could',
    'would',
    'should',
    'needful',
    'related',
    'works',
    'work',
    'doubt',
    'development',
    'datascience',
    'business',
    'clouds',
    'how',
    'what',
    'when',
    'where',
    'which',
    'their',
    'there',
    'these',
    'those',
    'very',
    'more',
    'most',
    'does',
    'done',
    'doing',
    'make',
    'made',
    'make',
    'know',
    'knows'
  ]);

  const specialtyTokenMatches = [...tokenSet]
    .filter((word) => word.length >= 2)
    .filter((word) => !stopWords.has(word))
    .filter((word) => skillTokenSet.has(word))
    .slice(0, 8);

  if (specialtyTokenMatches.length) {
    return specialtyTokenMatches;
  }

  if (specialtyMatches.length) {
    return specialtyMatches;
  }

  const keywords = text
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 2)
    .filter((word) => !stopWords.has(word))
    .filter((word) => word.length >= 4 || /\d/.test(word));

  return [...new Set(keywords)].slice(0, 8);
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

function getEffectiveStatus(doubt, sessionRow) {
  const baseStatus = String(doubt?.status || '').trim().toLowerCase();
  const sessionStatus = String(sessionRow?.status || '').trim().toLowerCase();

  if (sessionStatus === 'requested') return 'requested';
  if (sessionStatus === 'active') return 'in_chat';
  if (sessionStatus === 'completed') return 'completed';
  if (sessionStatus === 'declined') return 'declined';

  if (doubt?.assignedExpertId) return 'assigned';
  if (baseStatus === 'matched') return 'assigned';
  return 'open';
}

export const doubtService = {
  async getDoubts(actor = null) {
    const doubts = await doubtRepository.findAll();
    const filtered = !actor
      ? doubts
      : doubts.filter((doubt) => {
      const ownerById = Number(doubt.requesterUserId) === Number(actor.id);
      const ownerByName = normalizeName(doubt.requesterName) === normalizeName(actor.fullName);
      return ownerById || ownerByName;
    });

    const latestSessions = await sessionRepository.findLatestByDoubtIds(filtered.map((doubt) => doubt.id));
    const sessionByDoubtId = new Map(latestSessions.map((row) => [Number(row.doubt_id), row]));

    return filtered.map((doubt) => {
      const latestSession = sessionByDoubtId.get(Number(doubt.id)) || null;
      return {
        ...doubt,
        lifecycleTag: getEffectiveStatus(doubt, latestSession),
        latestSessionStatus: latestSession ? String(latestSession.status || '').toLowerCase() : null,
        latestSessionId: latestSession ? Number(latestSession.id) : null
      };
    });
  },

  async assignExpert(doubtId, expertId, actor = null) {
    const numericDoubtId = Number(doubtId);
    const numericExpertRef = Number(expertId);

    if (!Number.isInteger(numericDoubtId) || numericDoubtId <= 0) {
      throw new BadRequestError('doubtId must be a positive integer');
    }

    if (!Number.isInteger(numericExpertRef) || numericExpertRef <= 0) {
      throw new BadRequestError('expertId must be a positive integer');
    }

    // Accept either expert profile id or linked user id from client payloads.
    const expert = await expertRepository.resolveByIdOrUserId(numericExpertRef);
    if (!expert) {
      throw new NotFoundError('Expert not found');
    }
    const resolvedExpertId = Number(expert.id);

    const doubt = await doubtRepository.findById(numericDoubtId);
    if (!doubt) {
      throw new NotFoundError('Doubt not found');
    }

    if (actor && actor.role === 'student') {
      let isOwnerById = Number(doubt.requesterUserId) === Number(actor.id);
      const isOwnerByName = normalizeName(doubt.requesterName) === normalizeName(actor.fullName);

      if (!isOwnerById && !doubt.requesterUserId && isOwnerByName) {
        const claimed = await doubtRepository.claimOwnershipIfMissing(doubt.id, actor.id, actor.fullName);
        isOwnerById = Number(claimed?.requesterUserId) === Number(actor.id);
      }

      if (!isOwnerById && !isOwnerByName) {
        const error = new Error('Forbidden: you can assign experts only to your own doubts');
        error.status = 403;
        throw error;
      }
    }

    const updated = await doubtRepository.assignExpert(numericDoubtId, resolvedExpertId);
    if (!updated) {
      throw new NotFoundError('Doubt not found');
    }

    return updated;
  },

  async getMatchedExperts(doubtId) {
    const numericId = Number(doubtId);

    if (!Number.isInteger(numericId) || numericId <= 0) {
      throw new BadRequestError('id must be a positive integer');
    }

    const doubt = await doubtRepository.findById(numericId);
    if (!doubt) {
      throw new NotFoundError('Doubt not found');
    }

    const specialties = await expertRepository.findAllSpecialties();
    const keywords = extractKeywords(doubt, specialties);
    const experts = await expertRepository.findMatchesByKeywords(keywords, 5);

    return {
      doubt,
      keywords,
      matches: experts
    };
  },

  async deleteDoubt(id, actor = null) {
    const numericId = Number(id);

    if (!Number.isInteger(numericId) || numericId <= 0) {
      throw new BadRequestError('id must be a positive integer');
    }

    if (actor && actor.role === 'student') {
      const doubt = await doubtRepository.findById(numericId);
      if (!doubt) {
        throw new NotFoundError('Doubt not found');
      }
      const ownerById = Number(doubt.requesterUserId) === Number(actor.id);
      const ownerByName = normalizeName(doubt.requesterName) === normalizeName(actor.fullName);
      if (!ownerById && !ownerByName) {
        const error = new Error('Forbidden: only doubt owner can delete doubt');
        error.status = 403;
        throw error;
      }
    }

    const deleted = await doubtRepository.deleteById(numericId);
    if (!deleted) {
      throw new NotFoundError('Doubt not found');
    }

    return { id: numericId };
  },

  async createDoubt(input) {
    const requesterName = String(input.requesterName || '').trim();
    const requesterUserId = input.requesterUserId ? Number(input.requesterUserId) : null;
    const title = String(input.title || '').trim();
    const description = String(input.description || '').trim();
    const category = String(input.category || '').trim();

    if (!requesterName) {
      throw new BadRequestError('requesterName is required');
    }

    if (!title) {
      throw new BadRequestError('title is required');
    }

    if (!description) {
      throw new BadRequestError('description is required');
    }

    if (!category) {
      throw new BadRequestError('category is required');
    }

    return doubtRepository.create({ requesterUserId, requesterName, title, description, category });
  }
};
