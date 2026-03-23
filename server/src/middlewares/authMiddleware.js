import { authService } from '../services/authService.js';
import { userRepository } from '../repositories/userRepository.js';

export async function requireAuth(req, _res, next) {
  try {
    const authHeader = String(req.headers.authorization || '');
    if (!authHeader.startsWith('Bearer ')) {
      const error = new Error('Authorization token is required');
      error.status = 401;
      throw error;
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      const error = new Error('Authorization token is required');
      error.status = 401;
      throw error;
    }

    const decoded = authService.verifyToken(token);
    const currentUser = await userRepository.findById(decoded.id);
    if (!currentUser) {
      const error = new Error('User not found');
      error.status = 401;
      throw error;
    }

    req.user = {
      id: currentUser.id,
      fullName: currentUser.fullName,
      email: currentUser.email,
      role: String(currentUser.role || '').trim().toLowerCase()
    };
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...allowedRoles) {
  const normalized = allowedRoles.map((role) => String(role || '').trim().toLowerCase());

  return (req, _res, next) => {
    try {
      const role = String(req.user?.role || '').trim().toLowerCase();
      if (!normalized.includes(role)) {
        const error = new Error(`Forbidden: this action requires role ${normalized.join(' or ')} (current role: ${role || 'unknown'})`);
        error.status = 403;
        throw error;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
