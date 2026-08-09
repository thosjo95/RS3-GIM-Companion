/**
 * Minimal in-memory per-IP rate limiter (no external deps, same style as the
 * admin login limiter in adminAuth.js). Not suitable for a multi-process
 * deployment, but this app runs as a single PM2 fork instance.
 */

function createRateLimiter({ windowMs, max, message }) {
  const hits = new Map(); // ip -> { count, resetAt }

  // Periodically drop stale entries so the map doesn't grow forever
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of hits) {
      if (now > entry.resetAt) hits.delete(ip);
    }
  }, windowMs).unref();

  return function rateLimit(req, res, next) {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();
    let entry = hits.get(ip);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(ip, entry);
    }
    entry.count++;
    if (entry.count > max) {
      const secsLeft = Math.ceil((entry.resetAt - now) / 1000);
      return res.status(429).json({ error: message || `Too many requests. Try again in ${secsLeft}s.` });
    }
    next();
  };
}

module.exports = { createRateLimiter };
