const firebase = require('../config/firebase');
const ApiError = require('../utils/ApiError');

// Verifies "Authorization: Bearer <Firebase ID token>" and sets req.user.uid.
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(ApiError.unauthorized('Missing or malformed Authorization header. Use: Bearer <idToken>'));
  }

  try {
    const decoded = await firebase.verifyIdToken(token);
    req.user = { uid: decoded.uid, email: decoded.email || null };
    return next();
  } catch (err) {
    if (err && err.code === 'auth/id-token-expired') {
      return next(ApiError.unauthorized('ID token has expired. Refresh it and retry.', 'TOKEN_EXPIRED'));
    }
    if (err && typeof err.code === 'string' && err.code.startsWith('auth/')) {
      return next(ApiError.unauthorized('Invalid ID token', 'INVALID_TOKEN'));
    }
    return next(err); // e.g. missing Firebase config -> 500
  }
}

module.exports = requireAuth;
