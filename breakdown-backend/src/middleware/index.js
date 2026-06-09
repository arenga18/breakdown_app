const { validationResult } = require('express-validator');

// Validate and return 422 if errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  next();
};

// Paginate helper
const paginate = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(9999, Math.max(1, parseInt(query.limit) || 50));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

// Wrap async route handlers
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { validate, paginate, asyncHandler };
