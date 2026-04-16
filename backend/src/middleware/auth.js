import {
  clearSessionCookie,
  getAuthenticatedUserFromRequest,
  sanitizeUser,
} from '../services/auth.service.js';

export const requireAuth = async (req, res, next) => {
  try {
    const { user, session } = await getAuthenticatedUserFromRequest(req);

    if (!user || !session) {
      clearSessionCookie(res);
      return res.status(401).json({ error: 'Authentication required' });
    }

    req.user = user;
    req.session = session;
    req.authUser = sanitizeUser(user);

    return next();
  } catch (error) {
    return next(error);
  }
};

export const requireRole = (...roles) => {
  return async (req, res, next) => {
    try {
      const currentUser = req.user;

      if (!currentUser) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!roles.includes(currentUser.role)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};
