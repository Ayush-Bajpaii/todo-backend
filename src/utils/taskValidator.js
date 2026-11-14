const ApiError = require('./ApiError');

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];
const STATUSES = ['TODO', 'IN_PROGRESS', 'COMPLETED'];
const TITLE_MAX = 200;
const DESCRIPTION_MAX = 2000;

// Validates a request body and returns only the allowed, cleaned fields.
// partial = true for PATCH (every field optional, but at least one required).
function validateTask(body, { partial = false } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw ApiError.badRequest('Request body must be a JSON object');
  }

  const errors = [];
  const clean = {};

  // title
  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim() === '') {
      errors.push({ field: 'title', message: 'title must be a non-empty string' });
    } else if (body.title.trim().length > TITLE_MAX) {
      errors.push({ field: 'title', message: `title must be at most ${TITLE_MAX} characters` });
    } else {
      clean.title = body.title.trim();
    }
  } else if (!partial) {
    errors.push({ field: 'title', message: 'title is required' });
  }

  // description
  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== 'string') {
      errors.push({ field: 'description', message: 'description must be a string' });
    } else if (body.description.length > DESCRIPTION_MAX) {
      errors.push({ field: 'description', message: `description must be at most ${DESCRIPTION_MAX} characters` });
    } else {
      clean.description = body.description.trim();
    }
  } else if (body.description === null) {
    clean.description = '';
  }

  // priority
  if (body.priority !== undefined) {
    if (!PRIORITIES.includes(body.priority)) {
      errors.push({ field: 'priority', message: `priority must be one of ${PRIORITIES.join(', ')}` });
    } else {
      clean.priority = body.priority;
    }
  }

  // status
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) {
      errors.push({ field: 'status', message: `status must be one of ${STATUSES.join(', ')}` });
    } else {
      clean.status = body.status;
    }
  }

  // dueDate (ISO-8601 string or null)
  if (body.dueDate !== undefined) {
    if (body.dueDate === null) {
      clean.dueDate = null;
    } else if (typeof body.dueDate !== 'string' || Number.isNaN(Date.parse(body.dueDate))) {
      errors.push({ field: 'dueDate', message: 'dueDate must be an ISO-8601 date string or null' });
    } else {
      clean.dueDate = new Date(body.dueDate);
    }
  }

  if (errors.length > 0) {
    throw ApiError.badRequest('Invalid task data', errors);
  }
  if (partial && Object.keys(clean).length === 0) {
    throw ApiError.badRequest(
      'Provide at least one field to update: title, description, priority, status, dueDate'
    );
  }

  return clean;
}

module.exports = { validateTask, PRIORITIES, STATUSES };
