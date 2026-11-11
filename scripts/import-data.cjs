const fs = require('fs');
const path = require('path');

const targetDir = path.join(
  __dirname,
  '..',
  '.wrangler',
  'state',
  'v3',
  'd1',
  'miniflare-D1DatabaseObject'
);

const targetDb = path.join(
  targetDir,
  'faaf2b0445ab934c3aac48ddf0cdfade8f9bac050be98993748742cdd2cb05fb.sqlite'
);

const srcSqlite = path.join(__dirname, '..', 'data', 'movies.sqlite');

if (!fs.existsSync(srcSqlite)) {
  console.error('Data source does not exist at:', srcSqlite);
  process.exit(1);
}

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

fs.copyFileSync(srcSqlite, targetDb);
console.log('Successfully restored local database to:', targetDb);
