# Admin Dashboard - Quick Start Guide

## What's New? 🎉
A fully functional admin dashboard has been built with:
- Admin login system with secure session management
- Dashboard showing 8 key platform metrics
- User management (view, approve, disable accounts)
- Expert management (view ratings, sessions, approve/disable)
- Activity monitoring (track all sessions and doubts)
- Audit logging (track all admin actions)

## Installation (3 Steps)

### Step 1: Backend Setup ⚙️
```bash
cd server
npm install express-session
npm run dev  # Server runs on port 5000
```

### Step 2: Frontend Setup 🎨
```bash
cd client
npm run build  # Build production files
npm run dev    # Dev server runs on port 5173
```

### Step 3: Database Setup 💾
In a new terminal:
```bash
# Navigate to project root
cd d:\Expert_help

# Run SQL migration
mysql -u root -p < sql/014_create_admin_tables.sql
# Password: (your mysql root password)

# Initialize default admin user
node init-admin.js
```

## Default Admin Credentials 🔐

**After running init-admin.js:**
- Email: `admin@expertmatch.com`
- Password: `admin123`

⚠️ **IMPORTANT:** Change the password after first login!

## Access Admin Dashboard 🚀

1. Open browser: `http://localhost:5173`
2. Go to: `http://localhost:5173/admin/login`
3. Enter credentials above
4. Click "Access Admin Dashboard"

## Features Overview 📊

### Dashboard (Home)
Shows 6 stats cards:
- 👥 Approved Users (+ pending count)
- ⭐ Approved Experts (+ pending count)
- 💬 Total Sessions (avg rating)
- ❓ Total Doubts
- 🚫 Disabled Accounts
- 📝 Admin Activity

Quick action buttons for:
- Approve Pending Users
- Approve Pending Experts
- Monitor Activity
- View Audit Logs

### User Management
- View all users in paginated table (20 per page)
- Filter by status: Pending / Approved / Disabled
- Actions:
  - ✅ **Approve** - Mark user account as approved
  - 🚫 **Disable** - Deactivate account with reason
- Shows: Email, Name, Status, Doubt Count, Created Date

### Expert Management
- View all experts with detailed info
- Shows expertise, hourly rate, rating, session count
- Filter by status (same as users)
- Same approve/disable actions as users
- Displays average ratings from all sessions

### Activity Monitoring
- Track all active and completed sessions
- See student and expert names
- Show topic, status, rating (if completed)
- Filter by session status:
  - 🟢 Active - Currently in progress
  - ✅ Completed - Finished with rating
  - ⏳ Requested - Waiting for expert response
  - ❌ Declined - Expert declined session

### Audit Logs
- Complete history of all admin actions
- Shows: Date/Time, Admin Name, Action, Entity Type, Entity ID
- Filter by action type:
  - APPROVE_USER - User account approved
  - DISABLE_USER - User account disabled
  - APPROVE_EXPERT - Expert account approved
  - DISABLE_EXPERT - Expert account disabled
- Expandable details in JSON format

## Common Tasks 📋

### Approve a Pending User
1. Click "Users" in navigation
2. Select "⏳ Pending Approval" filter
3. Click "✅ Approve" button
4. User status changes to "✅ Approved"
5. Entry logged in Audit Logs

### Disable a User Account
1. Click "Users" tab
2. Find the user to disable
3. Click "🚫 Disable" button
4. Enter reason (e.g., "Spam reports", "Violates ToS")
5. Account status changes to "🚫 Disabled"
6. Reason stored in audit logs

### Check Session Ratings
1. Click "Activity" tab
2. Filter by "✅ Completed" status
3. View ratings in the table (⭐ 4.5/5)
4. See student/expert names and topics

### View What Admin Did
1. Click "Logs" tab
2. See all admin actions with timestamps
3. Click "View" on any row to see JSON details
4. Filter by specific action type if needed

## Troubleshooting 🐛

### Error: "Failed to load stats"
- ✓ Check if server is running: `npm run dev` in server directory
- ✓ Check if database tables exist: Run SQL migration again

### Error: "Invalid credentials"
- ✓ Verify email: `admin@expertmatch.com`
- ✓ Check password: `admin123` (case-sensitive)
- ✓ Run `node init-admin.js` if tables don't exist

### Can't access /admin/login
- ✓ Ensure client is running: `npm run dev` in client directory
- ✓ Try hard refresh: Ctrl+F5 (or Cmd+Shift+R on Mac)
- ✓ Check console for errors: F12 → Console tab

### Admin pages are blank
- ✓ Check browser console: F12
- ✓ Verify server is running and responding
- ✓ Check network tab for failed requests

### Styles look weird
- ✓ Clear browser cache: Ctrl+Shift+Del
- ✓ Rebuild client: `npm run build` then `npm run dev`

## Environment Variables (.env) 🔧

The following can be set in `server/.env`:
```
SESSION_SECRET=your-secret-key-here
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173
```

If not set, defaults are used (suitable for development)

## Security Reminders 🔐

Before going to production:

1. ✅ Change SESSION_SECRET in .env
2. ✅ Change default admin password
3. ✅ Set NODE_ENV=production
4. ✅ Use HTTPS URLs
5. ✅ Review audit logs regularly
6. ✅ Set up IP whitelisting for admin IPs
7. ✅ Enable 2FA (in future updates)
8. ✅ Set strong admin passwords (min 12 chars)

## File Structure 📁

```
Backend Admin:
- server/src/controllers/adminController.js (10 functions)
- server/src/routes/adminRoutes.js (12 endpoints)
- server/src/middlewares/adminMiddleware.js (auth)
- sql/014_create_admin_tables.sql (database schema)

Frontend Admin:
- client/src/pages/AdminLoginPage.jsx
- client/src/pages/AdminDashboard.jsx
- client/src/pages/AdminUsersPage.jsx
- client/src/pages/AdminExpertsPage.jsx
- client/src/pages/AdminActivityPage.jsx
- client/src/pages/AdminLogsPage.jsx
- client/src/app/AdminApp.jsx (router)
- client/src/styles/admin.css (styling)

Setup:
- init-admin.js (admin initialization)
- docs/admin-dashboard.md (full documentation)
```

## API Endpoints Reference 🔌

All endpoints require admin session (except /login and /check-auth)

```
POST   /api/admin/login                 - Admin login
GET    /api/admin/check-auth            - Verify session
POST   /api/admin/logout                - Admin logout
GET    /api/admin/dashboard/stats       - Dashboard metrics
GET    /api/admin/users                 - List users (paginated)
POST   /api/admin/users/:id/approve     - Approve user
POST   /api/admin/users/:id/disable     - Disable user
GET    /api/admin/experts               - List experts (paginated)
POST   /api/admin/experts/:id/approve   - Approve expert
POST   /api/admin/experts/:id/disable   - Disable expert
GET    /api/admin/activity-logs         - Audit logs (paginated)
GET    /api/admin/sessions-monitoring   - Monitor sessions
```

## Next Steps 🎯

1. ✅ Access admin dashboard: http://localhost:5173/admin/login
2. ✅ Explore all features
3. ✅ Approve some pending users/experts
4. ✅ Monitor active sessions
5. ✅ Review audit logs
6. ✅ Change admin password
7. ✅ Set up in production with .env

## Support 💬

For detailed documentation: See `docs/admin-dashboard.md`

For API details: See `docs/api-expert-profile.md`

---

**Admin Dashboard Ready!** 🎉 Enjoy managing your Expert Match platform!
