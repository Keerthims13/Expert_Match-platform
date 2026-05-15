import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminLoginPage from '../pages/AdminLoginPage.jsx';
import AdminDashboard from '../pages/AdminDashboard.jsx';
import AdminUsersPage from '../pages/AdminUsersPage.jsx';
import AdminExpertsPage from '../pages/AdminExpertsPage.jsx';
import AdminActivityPage from '../pages/AdminActivityPage.jsx';
import AdminLogsPage from '../pages/AdminLogsPage.jsx';
import AdminReportsPage from '../pages/AdminReportsPage.jsx';

function AdminApp() {
  return (
    <Router basename="/">
      <Routes>
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/experts" element={<AdminExpertsPage />} />
        <Route path="/admin/reports" element={<AdminReportsPage />} />
        <Route path="/admin/activity" element={<AdminActivityPage />} />
        <Route path="/admin/logs" element={<AdminLogsPage />} />
        <Route path="/admin/*" element={<Navigate to="/admin/dashboard" />} />
      </Routes>
    </Router>
  );
}

export default AdminApp;
