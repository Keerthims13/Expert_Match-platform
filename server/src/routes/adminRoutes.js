import express from 'express';
import {
  adminLogin,
  adminLogout,
  getDashboardStats,
  getAllUsers,
  getAllExperts,
  approveUser,
  disableUser,
  approveExpert,
  disableExpert,
  getActivityLogs,
  getSessionsMonitoring,
  checkAdminAuth
} from '../controllers/adminController.js';
import { getAdminReports, takeAdminReportAction } from '../controllers/reportController.js';
import { requireAdminAuth } from '../middlewares/adminMiddleware.js';

const router = express.Router();

// Public routes (no auth required)
router.post('/login', adminLogin);
router.get('/check-auth', checkAdminAuth);

// Protected routes (admin auth required)
router.post('/logout', requireAdminAuth, adminLogout);
router.get('/dashboard/stats', requireAdminAuth, getDashboardStats);

// Users management
router.get('/users', requireAdminAuth, getAllUsers);
router.post('/users/:userId/approve', requireAdminAuth, approveUser);
router.post('/users/:userId/disable', requireAdminAuth, disableUser);

// Experts management
router.get('/experts', requireAdminAuth, getAllExperts);
router.post('/experts/:expertId/approve', requireAdminAuth, approveExpert);
router.post('/experts/:expertId/disable', requireAdminAuth, disableExpert);

// Activity monitoring
router.get('/activity-logs', requireAdminAuth, getActivityLogs);
router.get('/sessions-monitoring', requireAdminAuth, getSessionsMonitoring);
router.get('/reports', requireAdminAuth, getAdminReports);
router.post('/reports/:reportId/action', requireAdminAuth, takeAdminReportAction);

export default router;
