const crypto = require('crypto');
const db = require('../database');

// PBKDF2 params for group secrets. Lower than the admin login's 600k iterations
// (see adminAuth.js) on purpose: this hash runs synchronously on every
// write-endpoint request (goal add, drop log, sync trigger, ...), not just a
// rare login, so it needs to stay well under ~50ms to avoid blocking Node's
// single event loop for other concurrent requests. 100k rounds is still a large
// improvement over the legacy unsalted single-round SHA-256 below.
const PBKDF2_ITER = 100_000;
const PBKDF2_LEN  = 64;
const PBKDF2_DIG  = 'sha512';

function hashPassword(pw, salt) {
  const saltBuf = salt ? Buffer.from(salt, 'hex') : crypto.randomBytes(32);
  const hash = crypto.pbkdf2Sync(String(pw), saltBuf, PBKDF2_ITER, PBKDF2_LEN, PBKDF2_DIG);
  return { hash: hash.toString('hex'), salt: saltBuf.toString('hex') };
}

// Legacy scheme (pre-PBKDF2 migration): unsalted single-round SHA-256.
// Only used to verify — and transparently upgrade — rows created before this change.
function legacyHash(pw) {
  return crypto.createHash('sha256').update(String(pw)).digest('hex');
}

function timingSafeStringEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Verifies `password` against a group row, transparently upgrading a legacy
// SHA-256 row to salted PBKDF2 in place on successful verification.
function verifyGroupPassword(password, group) {
  if (group.password_salt) {
    const { hash } = hashPassword(password, group.password_salt);
    return timingSafeStringEqual(hash, group.password_hash);
  }
  // Legacy row — no salt stored yet.
  if (!timingSafeStringEqual(legacyHash(password), group.password_hash)) return false;
  const upgraded = hashPassword(password);
  db.prepare('UPDATE groups SET password_hash = ?, password_salt = ? WHERE id = ?')
    .run(upgraded.hash, upgraded.salt, group.id);
  return true;
}

// Returns true if auth passes, false (and sends response) if not.
// groupId must be explicitly provided by the caller.
function checkGroupAuth(req, res, groupId) {
  if (!groupId) {
    res.status(401).json({ error: 'Missing group context' });
    return false;
  }

  const group = db.prepare('SELECT id, password_hash, password_salt FROM groups WHERE id = ?').get(groupId);
  if (!group) {
    res.status(404).json({ error: 'Group not found' });
    return false;
  }

  // Groups without a password set are open (migration / legacy)
  if (!group.password_hash) return true;

  const password = req.headers['x-group-password'];
  if (!password) {
    res.status(401).json({ error: 'Group password required' });
    return false;
  }

  if (!verifyGroupPassword(password, group)) {
    res.status(401).json({ error: 'Incorrect group password' });
    return false;
  }

  // Update last_activity on every successful write
  db.prepare('UPDATE groups SET last_activity = CURRENT_TIMESTAMP WHERE id = ?').run(group.id);
  return true;
}

module.exports = { hashPassword, verifyGroupPassword, checkGroupAuth };
