const ApiError = require('../utils/ApiError');

// 404 for unknown routes.
function notFound(req, res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

// Centralised error handler – every error becomes the same JSON shape.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Malformed JSON body sent by the client
  if (err.type === 'entity.parse.failed') {
    err = new ApiError(400, 'INVALID_JSON', 'Request body is not valid JSON');
  }

  if (err instanceof ApiError) {
    const error = { code: err.code, message: err.message };
    if (err.details) error.details = err.details;
    return res.status(err.status).json({ success: false, error });
  }

  console.error('Unexpected error:', err);
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again later.' },
  });
}

module.exports = { notFound, errorHandler };
