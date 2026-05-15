import { Router } from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';
import notificationController from '../controllers/notificationController.js';

const router = Router();

// All routes require authentication
router.use(requireAuth);

/**
 * IMPORTANT: Specific routes MUST come before generic :id routes
 * Otherwise /count will match as /:id with id="count"
 */

/**
 * GET /api/notifications/count - Get unread notification count
 */
router.get('/count', notificationController.getUnreadCount);

/**
 * GET /api/notifications/history - Get notification history with pagination
 * Query params: page (default 1), pageSize (default 20)
 */
router.get('/history', notificationController.getNotificationHistory);

/**
 * GET /api/notification-preferences - Get user notification preferences
 */
router.get('/preferences', notificationController.getNotificationPreferences);

/**
 * PUT /api/notification-preferences - Update notification preferences
 */
router.put('/preferences', notificationController.updateNotificationPreferences);

/**
 * PUT /api/notifications/read-all - Mark all notifications as read
 */
router.put('/read-all', notificationController.markAllAsRead);

/**
 * NOW the generic :id routes can come last
 */

/**
 * GET /api/notifications - Get unread notifications
 * Query params: limit (default 20)
 */
router.get('/', notificationController.getUnreadNotifications);

/**
 * PUT /api/notifications/:id/read - Mark single notification as read
 */
router.put('/:id/read', notificationController.markNotificationAsRead);

/**
 * DELETE /api/notifications/:id - Delete notification
 */
router.delete('/:id', notificationController.deleteNotification);

export default router;
