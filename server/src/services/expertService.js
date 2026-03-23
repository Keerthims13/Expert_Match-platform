import { expertRepository } from '../repositories/expertRepository.js';

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.status = 404;
  }
}

class BadRequestError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.status = 409;
  }
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function parseCommaList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

async function createUniqueSlug(baseValue) {
  const baseSlug = slugify(baseValue) || 'expert';
  let candidateSlug = baseSlug;
  let suffix = 2;

  while (await expertRepository.findBySlug(candidateSlug)) {
    candidateSlug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidateSlug;
}

export const expertService = {
  async getExpertList() {
    return expertRepository.findAll();
  },

  async deleteExpertProfile(identifier) {
    const deleted = await expertRepository.deleteByIdentifier(identifier);

    if (!deleted) {
      throw new NotFoundError('Expert profile not found');
    }

    return deleted;
  },

  async getExpertProfile(identifier) {
    const isNumeric = /^\\d+$/.test(identifier);

    const expert = isNumeric
      ? await expertRepository.findById(identifier)
      : await expertRepository.findBySlug(identifier);

    if (!expert) {
      throw new NotFoundError('Expert profile not found');
    }

    return expert;
  },

  async getMyExpertProfile(userId) {
    const numericUserId = Number(userId);
    if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
      throw new BadRequestError('userId must be a positive integer');
    }

    const expert = await expertRepository.findByUserId(numericUserId);
    if (!expert) {
      throw new NotFoundError('Expert profile not found');
    }
    return expert;
  },

  async updateMyAvailability(userId, availabilityStatus) {
    const normalizedStatus = String(availabilityStatus || '').trim().toLowerCase();
    if (!['available', 'busy', 'offline'].includes(normalizedStatus)) {
      throw new BadRequestError('availabilityStatus must be available, busy, or offline');
    }

    const updated = await expertRepository.updateAvailabilityByUserId(userId, normalizedStatus);
    if (!updated) {
      throw new NotFoundError('Expert profile not found');
    }

    return updated;
  },

  async createExpertProfile(input, actor = null) {
    if (!actor) {
      throw new BadRequestError('Authenticated user is required');
    }

    if (String(actor.role || '').toLowerCase() !== 'expert') {
      const error = new Error('Forbidden: only expert accounts can create expert profile');
      error.status = 403;
      throw error;
    }

    const userId = Number(actor.id);
    const fullName = String(input.fullName || '').trim();
    const skills = parseCommaList(input.skills);
    const pricePerMinute = Number(input.pricePerMinute);
    const availabilityStatus = String(input.availabilityStatus || '').trim().toLowerCase();

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new BadRequestError('userId must be a positive integer');
    }

    if (!fullName) {
      throw new BadRequestError('fullName is required');
    }

    if (!skills.length) {
      throw new BadRequestError('At least one skill is required');
    }

    if (!Number.isFinite(pricePerMinute) || pricePerMinute <= 0) {
      throw new BadRequestError('pricePerMinute must be greater than 0');
    }

    if (!['available', 'busy', 'offline'].includes(availabilityStatus)) {
      throw new BadRequestError('availabilityStatus must be available, busy, or offline');
    }

    const preferredSlug = input.slug ? String(input.slug) : fullName;
    const slug = await createUniqueSlug(preferredSlug);
    const payload = {
      userId,
      slug,
      fullName: fullName || String(actor.fullName || '').trim(),
      title: String(input.title || 'Independent Expert').trim(),
      headline: String(input.headline || 'Available for practical problem solving').trim(),
      category: String(input.category || 'General').trim(),
      experienceYears: Number(input.experienceYears || 0),
      pricePerMinute,
      availabilityStatus,
      about: String(input.about || '').trim(),
      education: String(input.education || '').trim(),
      languages: parseCommaList(input.languages),
      profileImageUrl: String(input.profileImageUrl || '').trim(),
      skills
    };

    const createResult = await expertRepository.createProfile(payload);

    if (createResult.duplicateUserProfile) {
      throw new ConflictError('An expert profile already exists for this userId');
    }

    return expertRepository.findById(createResult.expertId);
  }
};
