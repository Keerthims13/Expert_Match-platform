import { authService } from '../services/authService.js';

export function requireAuth(req, _res, next) {
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

    req.user = authService.verifyToken(token);
    next();
  } catch (error) {
    next(error);
  }
}
