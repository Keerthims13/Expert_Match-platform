export function requireAdminAuth(req, res, next) {
  if (!req.session.isAdmin || !req.session.adminId) {
    return res.status(401).json({ message: 'Unauthorized: Admin authentication required' });
  }
  next();
}

export function optionalAdminAuth(req, res, next) {
  // Just continue, admin status will be checked in the controller if needed
  next();
}
