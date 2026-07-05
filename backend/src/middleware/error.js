// Centralized async wrapper + error handler.

// Wrap an async route so thrown errors reach the error handler.
const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function notFound(_req, res) {
  res.status(404).json({ error: 'Not found.' });
}

function errorHandler(err, _req, res, _next) {
  // Postgres unique violation -> 409
  if (err.code === '23505') {
    return res.status(409).json({ error: 'A record with that value already exists.' });
  }
  console.error('[error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error.' });
}

module.exports = { asyncH, notFound, errorHandler };
