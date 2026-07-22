const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.resolve(process.cwd(), 'analytics.db');

if (!fs.existsSync(DB_PATH)) {
  console.error("❌ Database analytics.db not found. Run the app first to initialize it.");
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length !== 2) {
  console.log("Usage: node set-org-password.cjs <OrgName> <Password>");
  process.exit(1);
}

const orgName = args[0].trim();
const password = args[1].trim();

const db = new Database(DB_PATH);

// Create org if it doesn't exist
db.prepare('INSERT OR IGNORE INTO orgs (name) VALUES (?)').run(orgName.toLowerCase());

// Get the org
const org = db.prepare('SELECT * FROM orgs WHERE name = ? COLLATE NOCASE').get(orgName.toLowerCase());

if (!org) {
  console.error("❌ Failed to get or create organization.");
  process.exit(1);
}

if (org.password_hash) {
  console.log(`⚠️ Organization "${org.name}" already has a password set. We cannot overwrite it.`);
  process.exit(0);
}

// Hash password and save
const saltRounds = 10;
bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error("❌ Failed to hash password:", err);
    process.exit(1);
  }

  db.prepare('UPDATE orgs SET password_hash = ? WHERE id = ?').run(hash, org.id);
  console.log(`✅ Password successfully set for organization "${org.name}".`);
});
