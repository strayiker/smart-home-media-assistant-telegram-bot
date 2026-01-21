#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function usage() {
  console.error('Usage: node scripts/generate-rename-map-for-batch.cjs <prefix> [--out=rename-maps/<file>.csv] [--audit=audit/relocation-map.csv] [--dry-run]');
  process.exit(2);
}

const argv = process.argv.slice(2);
if (argv.length < 1) usage();

const prefix = argv[0].replace(/\/$/, '');
const outArg = argv.find((a) => a.startsWith('--out='));
const auditArg = argv.find((a) => a.startsWith('--audit='));
const dryRun = argv.includes('--dry-run');

const auditPath = auditArg ? auditArg.split('=')[1] : path.join('audit', 'relocation-map.csv');
const defaultOut = path.join('rename-maps', prefix.replace(/\//g, '-').replace(/^src-/, '') + '.csv');
const outPath = outArg ? outArg.split('=')[1] : defaultOut;

if (!fs.existsSync(auditPath)) {
  console.error('Audit file not found:', auditPath);
  process.exit(1);
}

const raw = fs.readFileSync(auditPath, 'utf8');
const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

const matches = lines.filter((l) => {
  const src = l.split(',')[0];
  return src === prefix || src.startsWith(prefix + '/');
});

console.log(`Found ${matches.length} entries for prefix "${prefix}"`);
if (matches.length === 0) process.exit(0);

if (dryRun) {
  console.log('Dry-run, not writing file. Example lines:');
  console.log(matches.slice(0, 20).join('\n'));
  process.exit(0);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, matches.join('\n') + '\n', 'utf8');
console.log('Wrote', outPath);
process.exit(0);
