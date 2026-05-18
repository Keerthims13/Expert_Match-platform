import { authService } from '../services/authService.js';
import { getDbPool } from '../config/db.js';

export async function register(req, res, next) {
	try {
		const result = await authService.register(req.body || {});
		res.json({ data: result });
	} catch (err) {
		next(err);
	}
}

export async function registerWithAvatar(req, res, next) {
	try {
		const payload = {
			fullName: req.body.fullName || '',
			email: req.body.email || '',
			password: req.body.password || '',
			role: req.body.role || 'student',
			profileImageUrl: req.file ? `/uploads/avatars/${req.file.filename}` : ''
		};
		const result = await authService.register(payload);
		res.json({ data: result });
	} catch (err) {
		next(err);
	}
}

export async function login(req, res, next) {
	try {
		const result = await authService.login(req.body || {});
		res.json({ data: result });
	} catch (err) {
		next(err);
	}
}

export async function loginWithGoogle(req, res, next) {
	try {
		const result = await authService.loginWithGoogle(req.body || {});
		res.json({ data: result });
	} catch (err) {
		next(err);
	}
}

export async function me(req, res, next) {
	try {
		const userId = req.user?.id;
		if (!userId) {
			const error = new Error('Unauthorized');
			error.status = 401;
			throw error;
		}
		const result = await authService.me(userId);
		res.json({ data: result });
	} catch (err) {
		next(err);
	}
}

export async function uploadMyAvatar(req, res, next) {
	try {
		const userId = req.user?.id;
		if (!userId) {
			const error = new Error('Unauthorized');
			error.status = 401;
			throw error;
		}

		if (!req.file) {
			const error = new Error('No file uploaded');
			error.status = 400;
			throw error;
		}

		const profileImageUrl = `/uploads/avatars/${req.file.filename}`;
		const result = await authService.updateMyProfileImage(userId, profileImageUrl);
		res.json({ data: result });
	} catch (err) {
		next(err);
	}
}

export async function completeOnboarding(req, res, next) {
	try {
		const userId = req.user?.id;
		if (!userId) {
			const error = new Error('Unauthorized');
			error.status = 401;
			throw error;
		}

		try {
			const { userRepository } = await import('../repositories/userRepository.js');
			if (typeof userRepository.markOnboardingComplete === 'function') {
				const user = await userRepository.markOnboardingComplete(userId);
				res.json({ data: { success: true, user } });
				return;
			}
		} catch (_e) {
			// ignore
		}

		try {
			const pool = getDbPool();
			await pool.query('UPDATE users SET onboarding_completed = 1 WHERE id = ? LIMIT 1', [userId]);
		} catch (_e) {}

		res.json({ data: { success: true } });
	} catch (err) {
		next(err);
	}
}

export default {
	register,
	registerWithAvatar,
	login,
	loginWithGoogle,
	me,
	uploadMyAvatar,
	completeOnboarding
};
