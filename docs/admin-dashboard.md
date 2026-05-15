# Admin Dashboard Implementation Guide

## Overview
A complete admin dashboard system has been implemented for the Expert Match platform, enabling administrators to manage users, experts, approve/disable accounts, and monitor platform activity.

## Architecture

### Backend Components

#### 1. Admin Controller (`server/src/controllers/adminController.js`)
Handles all admin business logic with the following functions:

- **`adminLogin(email, password)`** - Authenticates admin and creates session
- **`adminLogout()`** - Destroys admin session
- **`checkAdminAuth()`** - Verifies admin session validity
- **`getDashboardStats()`** - Returns 8 key metrics for dashboard overview
- **`getAllUsers(page, limit, status)`** - Paginated user list with filtering
- **`getAllExperts(page, limit, status)`** - Paginated expert list with ratings
- **`approveUser/approveExpert(id)`** - Approves pending accounts
- **`disableUser/disableExpert(id, reason)`** - Disables accounts with reason logging
- **`getActivityLogs(page, limit, action)`** - Audit log retrieval with admin info
- **`getSessionsMonitoring(page, limit, status)`** - Monitor chat sessions and doubts

#### 2. Admin Routes (`server/src/routes/adminRoutes.js`)
REST API endpoints structured as:

```
POST   /api/admin/login                    - Admin login
GET    /api/admin/check-auth              - Check session validity
POST   /api/admin/logout                  - Admin logout
GET    /api/admin/dashboard/stats         - Dashboard statistics
GET    /api/admin/users                   - List all users
POST   /api/admin/users/:userId/approve   - Approve user account
POST   /api/admin/users/:userId/disable   - Disable user account
GET    /api/admin/experts                 - List all experts
POST   /api/admin/experts/:expertId/approve  - Approve expert account
POST   /api/admin/experts/:expertId/disable  - Disable expert account
GET    /api/admin/activity-logs           - Audit logs
GET    /api/admin/sessions-monitoring     - Session monitoring
```

Protected routes require `requireAdminAuth` middleware (checks `req.session.isAdmin`)

#### 3. Admin Middleware (`server/src/middlewares/adminMiddleware.js`)
- `requireAdminAuth` - Protects admin-only routes
- `optionalAdminAuth` - For future flexibility

#### 4. Database Schema (`sql/014_create_admin_tables.sql`)

**New Tables:**
```sql
admins (id, email, password, fullName, role, isActive, createdAt, updatedAt)
audit_logs (id, adminId, action, entityType, entityId, details, ipAddress, createdAt)
```

**New Columns on users/experts:**
```sql
accountStatus (pending|approved|disabled)
accountDisabledReason (VARCHAR(255))
approvedBy (FK to admins)
approvedAt (TIMESTAMP)
```

### Frontend Components

#### 1. Admin Router (`client/src/app/AdminApp.jsx`)
Handles routing for admin pages using React Router DOM:
- `/admin/login` - Login page
- `/admin/dashboard` - Dashboard overview
- `/admin/users` - User management
- `/admin/experts` - Expert management
- `/admin/activity` - Activity monitoring
- `/admin/logs` - Audit logs

#### 2. Admin Pages

**AdminLoginPage.jsx**
- Email and password form
- Basic validation
- Session storage
- Error handling
- Redirects to dashboard on success

**AdminDashboard.jsx**
- 6 stats cards (Users, Experts, Sessions, Doubts, Disabled, Activity)
- Quick action buttons
- Session authentication check
- Logout functionality

**AdminUsersPage.jsx**
- Paginated table (20 items per page)
- Filter by status (pending/approved/disabled)
- Approve/Disable actions
- Inline disable reason modal
- Status badges

**AdminExpertsPage.jsx**
- Enhanced table with expertise, rating, sessions, price
- Same pagination and filtering as users
- Rating display (average and count)
- Session count tracking

**AdminActivityPage.jsx**
- Sessions and doubts monitoring
- Status filtering (active/completed/requested/declined)
- Session details with student/expert info
- Rating visibility

**AdminLogsPage.jsx**
- Audit log table with timestamps
- Filter by action (APPROVE_USER, DISABLE_USER, etc.)
- Expandable JSON details
- Admin name tracking

#### 3. Admin Styles (`client/src/styles/admin.css`)
- Complete styling for all admin pages
- Responsive design (mobile: 768px breakpoint)
- Color-coded status badges
- Professional typography and spacing
- Smooth animations and transitions

### Integration Points

#### Session Management
- Express-session middleware configured in `app.js`
- Session secret: `process.env.SESSION_SECRET`
- 24-hour session timeout
- HttpOnly cookies for security
- CORS support for session cookies

#### CORS Configuration
- Admin pages accessible from localhost:5173-5175 and `process.env.CLIENT_URL`
- Session credentials included in requests

#### Socket.IO
- Integrates with existing notification system
- Can be extended for real-time admin updates

## Database Setup

### 1. Run Migration
```bash
mysql -u root -p expertmatch < sql/014_create_admin_tables.sql
```

### 2. Initialize Admin User
```bash
cd d:\Expert_help
node init-admin.js
```

This creates:
- Email: `admin@expertmatch.com`
- Password: `admin123` (Change after first login!)

## Deployment Steps

### 1. Backend Setup
```bash
cd server
npm install express-session
npm run dev
```

### 2. Frontend Setup
```bash
cd client
npm install react-router-dom
npm run build
npm run dev
```

### 3. Database Execution
```bash
mysql -u root -p expertmatch < sql/014_create_admin_tables.sql
node init-admin.js
```

## Usage

### Admin Login
1. Navigate to `http://localhost:5173/admin/login`
2. Enter credentials (admin@expertmatch.com / admin123)
3. Redirected to dashboard

### User Management
1. Go to **Users** tab
2. Filter by status (pending/approved/disabled)
3. Click **Approve** to accept pending users
4. Click **Disable** to deactivate with reason

### Expert Management
1. Go to **Experts** tab
2. View ratings, sessions, and expertise
3. Approve or disable expert accounts
4. See average ratings from all sessions

### Activity Monitoring
1. **Sessions** tab shows all active/completed sessions
2. **Logs** tab shows all admin actions with timestamps
3. Search and filter by action type

### Dashboard Stats
- Real-time count of approved users/experts
- Pending approval counts
- Platform-wide statistics
- Disabled account overview

## Security Considerations

### Current Implementation
- Session-based authentication
- Protected routes with middleware
- Audit logging of all admin actions
- Password hashing with bcryptjs
- HttpOnly cookies (prevents XSS)
- CSRF protection ready (can add token validation)

### Recommendations
1. Change SESSION_SECRET in production (.env)
2. Use HTTPS in production
3. Implement IP whitelisting for admin access
4. Add rate limiting to login endpoint
5. Monitor audit logs for suspicious activity
6. Require strong passwords for admin accounts
7. Implement 2FA for additional security

## API Response Examples

### Dashboard Stats
```json
{
  "totalUsers": 42,
  "totalExperts": 18,
  "pendingUsers": 5,
  "pendingExperts": 2,
  "totalSessions": 156,
  "totalDoubts": 89,
  "averageRating": 4.2,
  "disabledAccounts": 3
}
```

### Users List
```json
{
  "users": [
    {
      "id": 1,
      "email": "user@email.com",
      "fullName": "John Doe",
      "accountStatus": "pending",
      "doubtCount": 2,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

### Experts List
```json
{
  "experts": [
    {
      "id": 1,
      "email": "expert@email.com",
      "fullName": "Jane Expert",
      "expertise": "Mathematics",
      "pricePerMinute": 10,
      "rating": 4.5,
      "sessionCount": 24,
      "ratingCount": 12,
      "averageRating": 4.5,
      "accountStatus": "approved"
    }
  ],
  "total": 18,
  "page": 1,
  "limit": 20
}
```

## Feature Checklist

✅ Admin login with session management
✅ Dashboard with 6 key metrics
✅ View all users with pagination
✅ View all experts with ratings
✅ Approve pending accounts
✅ Disable accounts with reason logging
✅ Activity monitoring (sessions/doubts)
✅ Audit log tracking all admin actions
✅ Filter and search functionality
✅ Responsive design
✅ Professional UI
✅ Session authentication middleware
✅ Protected admin routes

## Files Created/Modified

### New Files
- `server/src/controllers/adminController.js`
- `server/src/routes/adminRoutes.js`
- `server/src/middlewares/adminMiddleware.js`
- `client/src/pages/AdminLoginPage.jsx`
- `client/src/pages/AdminDashboard.jsx`
- `client/src/pages/AdminUsersPage.jsx`
- `client/src/pages/AdminExpertsPage.jsx`
- `client/src/pages/AdminActivityPage.jsx`
- `client/src/pages/AdminLogsPage.jsx`
- `client/src/app/AdminApp.jsx`
- `client/src/styles/admin.css`
- `sql/014_create_admin_tables.sql`
- `init-admin.js`

### Modified Files
- `server/src/app.js` - Added admin routes and session middleware
- `client/src/main.jsx` - Added admin app routing
- `server/package.json` - Added express-session
- `client/package.json` - Added react-router-dom

## Troubleshooting

### Sessions Not Working
- Check if express-session is installed: `npm list express-session`
- Verify SESSION_SECRET is set in .env
- Ensure CORS credentials are set to true in fetch requests

### Admin Not Found
- Run database migration: `mysql -u root -p expertmatch < sql/014_create_admin_tables.sql`
- Initialize admin: `node init-admin.js`

### Login Redirects Not Working
- Check if React Router is installed: `npm list react-router-dom`
- Verify admin routes in AdminApp.jsx
- Check browser console for errors

### Styles Not Applied
- Ensure admin.css is imported in main.jsx
- Check CSS file path is correct
- Clear browser cache (Ctrl+Shift+Del)

## Future Enhancements

1. **Advanced Analytics** - Charts and graphs for platform metrics
2. **Bulk Operations** - Approve/disable multiple accounts at once
3. **Admin Roles** - Super admin, moderator roles with different permissions
4. **Export Reports** - CSV/PDF export of users, experts, and activity
5. **System Notifications** - Real-time alerts for critical activities
6. **User Search** - Advanced search across email, name, expertise
7. **Manual User Registration** - Admin can create users/experts directly
8. **Ban System** - Permanent ban for users/experts with reason
9. **Email Templates** - Send approval/rejection emails
10. **Two-Factor Authentication** - Additional security for admin accounts

## Support & Documentation

For detailed API documentation, see: `/docs/api-expert-profile.md`

For session management setup: Refer to express-session documentation
For styling: See `client/src/styles/admin.css` for CSS custom properties
