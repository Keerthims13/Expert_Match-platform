import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { userRepository } from '../repositories/userRepository.js';

class BadRequestError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

class UnauthorizedError extends Error {
  constructor(message) {
    super(message);
    this.status = 401;
  }
}

class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.status = 409;
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const TOKEN_EXPIRY = process.env.JWT_EXPIRY || '7d';

function sanitizeUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role
  };
}

function normalizeRole(role) {
  const value = String(role || '').trim().toLowerCase();
  if (!['student', 'expert'].includes(value)) {
    throw new BadRequestError('role must be student or expert');
  }
  return value;
}

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
      fullName: user.fullName
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

export const authService = {
  async register(input) {
    const fullName = String(input.fullName || '').trim();
    const email = String(input.email || '').trim().toLowerCase();
    const password = String(input.password || '');
    const role = normalizeRole(input.role);

    if (!fullName) throw new BadRequestError('fullName is required');
    if (!email) throw new BadRequestError('email is required');
    if (!password || password.length < 6) {
      throw new BadRequestError('password must be at least 6 characters');
    }

    const existing = await userRepository.findByEmail(email);
    if (existing) throw new ConflictError('Email already in use');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await userRepository.create({ fullName, email, role, passwordHash });
    const token = signToken(user);

    return {
      token,
      user: sanitizeUser(user)
    };
  },

  async login(input) {
    const email = String(input.email || '').trim().toLowerCase();
    const password = String(input.password || '');

    if (!email) throw new BadRequestError('email is required');
    if (!password) throw new BadRequestError('password is required');

    const user = await userRepository.findByEmail(email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) throw new UnauthorizedError('Invalid email or password');

    const token = signToken(user);
    return {
      token,
      user: sanitizeUser(user)
    };
  },

  async me(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw new UnauthorizedError('User not found');
    return sanitizeUser(user);
  },

  verifyToken(token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      return {
        id: Number(payload.sub),
        fullName: payload.fullName,
        email: payload.email,
        role: payload.role
      };
    } catch (_error) {
      throw new UnauthorizedError('Invalid or expired token');
    }
  }
};
