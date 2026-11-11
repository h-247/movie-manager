const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const srcDb = path.join(
  __dirname,
  '..',
  '.wrangler',
  'state',
  'v3',
  'd1',
  'miniflare-D1DatabaseObject',
  'faaf2b0445ab934c3aac48ddf0cdfade8f9bac050be98993748742cdd2cb05fb.sqlite'
);

if (!fs.existsSync(srcDb)) {
  console.error('Source database does not exist at:', srcDb);
  process.exit(1);
}

const db = new DatabaseSync(srcDb);
const rows = db.prepare('SELECT * FROM movies').all();

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 1. JSON export
const jsonPath = path.join(dataDir, 'local-data.json');
fs.writeFileSync(jsonPath, JSON.stringify(rows, null, 2), 'utf8');

// 2. SQL dump
let sql = '-- Local Data Export: movies table\n';
sql += '-- Generated at: ' + new Date().toISOString() + '\n\n';
for (const row of rows) {
  const cols = Object.keys(row);
  const colNames = cols.map((c) => `"${c}"`).join(', ');
  const vals = cols
    .map((c) => {
      const v = row[c];
      if (v === null || v === undefined) return 'NULL';
      if (typeof v === 'number') return v;
      return `'${String(v).replace(/'/g, "''")}'`;
    })
    .join(', ');
  sql += `INSERT OR REPLACE INTO movies (${colNames}) VALUES (${vals});\n`;
}
const sqlPath = path.join(dataDir, 'local-data.sql');
fs.writeFileSync(sqlPath, sql, 'utf8');

// 3. SQLite copy
const sqlitePath = path.join(dataDir, 'movies.sqlite');
fs.copyFileSync(srcDb, sqlitePath);

console.log(`Successfully exported ${rows.length} movies to:`);
console.log(`- ${jsonPath}`);
console.log(`- ${sqlPath}`);
console.log(`- ${sqlitePath}`);
