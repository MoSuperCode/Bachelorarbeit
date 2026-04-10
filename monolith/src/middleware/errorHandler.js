/**
 * Zentrale Fehlerbehandlungs-Middleware.
 * Muss 4 Parameter haben, damit Express sie als Error Handler erkennt.
 * Wird als letztes Middleware in app.js registriert.
 */
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  // Fehler loggen mit Zeitstempel
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} → ${status}: ${message}`);

  res.status(status).json({
    error: { status, message },
  });
}

module.exports = errorHandler;
