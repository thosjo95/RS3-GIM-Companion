/**
 * Admin authentication — uses only Node.js built-in crypto (no npm deps).
 *
 * Password hashing : PBKDF2-SHA512, 600 000 iterations, 64-byte output.
 * Token signing    : HS256-style HMAC-SHA256 (base64url header.payload.sig).
 * Rate limiting    : in-memory map, max 5 attempts per 15 min per IP.
 */

const crypto = require('crypto');
const path   = require('path');
const fs     = require('fs');

// ── JWT secret (persisted to disk so tokens survive server restarts) ──────────
const SECRET_PATH = path.join(__dirname, '../data/jwt_secret.bin');
let JWT_SECRET;
try {
  JWT_SECRET = fs.readFileSync(SECRET_PATH);
} catch {
  JWT_SECRET = crypto.randomBytes(64);
  fs.writeFileSync(SECRET_PATH, JWT_SECRET, { mode: 0o600 });
}

// ── PBKDF2 helpers ────────────────────────────────────────────────────────────
const PBKDF2_ITER = 600_000;
const PBKDF2_LEN  = 64;
const PBKDF2_DIG  = 'sha512';

function hashPassword(password, salt) {
  const saltBuf = salt ? Buffer.from(salt, 'hex') : crypto.randomBytes(32);
  const hash = crypto.pbkdf2Sync(password, saltBuf, PBKDF2_ITER, PBKDF2_LEN, PBKDF2_DIG);
  return { hash: hash.toString('hex'), salt: saltBuf.toString('hex') };
}

function verifyPassword(password, storedHash, storedSalt) {
  const { hash } = hashPassword(password, storedSalt);
  // constant-time compare
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
}

// ── HS256 token helpers ───────────────────────────────────────────────────────
function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

function signToken(payload) {
  const header  = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body    = b64url(JSON.stringify(payload));
  const sig     = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

function verifyToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && Date.now() / 1000 > payload.exp) return null; // expired
    return payload;
  } catch {
    return null;
  }
}

function issueToken(username) {
  return signToken({
    sub: username,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60, // 8 hours
  });
}

// ── In-memory rate limiter ────────────────────────────────────────────────────
// Keyed by IP: { attempts, resetAt }
const rateLimitMap = new Map();
const RL_MAX      = 5;          // max failed attempts
const RL_WINDOW   = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip) {
  const now = Date.now();
  let entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { attempts: 0, resetAt: now + RL_WINDOW };
    rateLimitMap.set(ip, entry);
  }
  if (entry.attempts >= RL_MAX) {
    const secsLeft = Math.ceil((entry.resetAt - now) / 1000);
    return { blocked: true, secsLeft };
  }
  return { blocked: false };
}

function recordFailedAttempt(ip) {
  const now = Date.now();
  let entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { attempts: 0, resetAt: now + RL_WINDOW };
  }
  entry.attempts++;
  rateLimitMap.set(ip, entry);
}

function clearRateLimit(ip) {
  rateLimitMap.delete(ip);
}

// ── Express middleware — protect admin routes ─────────────────────────────────
function requireAdmin(req, res, next) {
  const auth  = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Admin authentication required' });
  req.adminUser = payload.sub;
  next();
}

module.exports = { hashPassword, verifyPassword, issueToken, verifyToken, checkRateLimit, recordFailedAttempt, clearRateLimit, requireAdmin };
