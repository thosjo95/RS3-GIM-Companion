/**
 * Create an admin account, or change an existing admin's password.
 *
 *   node server/scripts/setAdminPassword.js [username]      (default username: admin)
 *
 * The password is read from a hidden prompt (or the ADMIN_PASSWORD env var for
 * scripted use) — never pass it as a command-line argument, those end up in
 * shell history and `ps` output.
 */
const path = require('path');
const readline = require('readline');

process.chdir(path.join(__dirname, '..'));
const db = require('../database');
const { hashPassword } = require('../utils/adminAuth');

const username = (process.argv[2] || 'admin').trim().toLowerCase();

function promptHidden(question) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = s => { if (s.includes(question)) process.stdout.write(s); };
    rl.question(question, answer => { rl.close(); process.stdout.write('\n'); resolve(answer); });
  });
}

(async () => {
  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    password = await promptHidden(`New password for "${username}": `);
    const confirm = await promptHidden('Confirm password: ');
    if (password !== confirm) { console.error('Passwords do not match — nothing changed.'); process.exit(1); }
  }
  if (password.length < 12) { console.error('Password must be at least 12 characters — nothing changed.'); process.exit(1); }

  const { hash, salt } = hashPassword(password);
  const existing = db.prepare('SELECT id FROM admin_users WHERE username = ?').get(username);
  if (existing) {
    db.prepare('UPDATE admin_users SET password_hash = ?, salt = ? WHERE id = ?').run(hash, salt, existing.id);
    console.log(`Password updated for admin "${username}".`);
  } else {
    db.prepare('INSERT INTO admin_users (username, password_hash, salt) VALUES (?, ?, ?)').run(username, hash, salt);
    console.log(`Admin "${username}" created.`);
  }
  process.exit(0);
})();
