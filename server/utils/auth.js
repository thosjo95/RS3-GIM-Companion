const crypto = require('crypto');
const db = require('../database');

function hashPassword(pw) {
  return crypto.createHash('sha256').update(String(pw)).digest('hex');
}

// Returns true if auth passes, false (and sends response) if not.
// groupId must be explicitly provided by the caller.
function checkGroupAuth(req, res, groupId) {
  if (!groupId) {
    res.status(401).json({ error: 'Missing group context' });
    return false;
  }

  const group = db.prepare('SELECT id, password_hash FROM groups WHERE id = ?').get(groupId);
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

  if (hashPassword(password) !== group.password_hash) {
    res.status(401).json({ error: 'Incorrect group password' });
    return false;
  }

  // Update last_activity on every successful write
  db.prepare('UPDATE groups SET last_activity = CURRENT_TIMESTAMP WHERE id = ?').run(group.id);
  return true;
}

module.exports = { hashPassword, checkGroupAuth };
