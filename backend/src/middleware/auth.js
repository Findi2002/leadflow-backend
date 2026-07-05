const jwt = require('jsonwebtoken');
const config = require('../config');

function sign(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

// Populates req.user when a valid Bearer token is present. Does not reject.
function authOptional(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      req.user = jwt.verify(token, config.jwtSecret);
    } catch {
      /* ignore invalid token for optional auth */
    }
  }
  next();
}

// Rejects with 401 if no valid token.
function requireAuth(req, res, next) {
  authOptional(req, res, () => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    next();
  });
}

// Rejects with 403 if the user's role isn't in the allowed list.
function requireRole(...roles) {
  return (req, res, next) => {
    requireAuth(req, res, () => {
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: `Requires role: ${roles.join(' or ')}.` });
      }
      next();
    });
  };
}

module.exports = { sign, authOptional, requireAuth, requireRole };
