function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} → ${status}: ${message}`);
  res.status(status).json({ error: { status, message } });
}

module.exports = errorHandler;
