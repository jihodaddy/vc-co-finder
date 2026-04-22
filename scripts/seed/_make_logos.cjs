// One-shot helper to emit 1x1 transparent PNG placeholders for Phase 2 seed.
// Usage: node scripts/seed/_make_logos.cjs
// After running, this file can remain committed or be deleted — it is idempotent.
const fs = require('node:fs');
const path = require('node:path');

const PNG_1X1_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const SLUGS = [
  'toss', 'daangn', 'coupang', 'baemin',
  'krafton', 'kurly', 'woowa', 'kakaomobility',
  'marketkurly', 'viva-republica', 'coupang-branch', 'daangn-branch',
  'myrealtrip', 'yanolja', 'banksalad', 'sendbird',
  'rablup', 'sendy', 'lunit',
];

const outDir = path.resolve(__dirname, '..', '..', 'public', 'logos');
fs.mkdirSync(outDir, { recursive: true });
const buf = Buffer.from(PNG_1X1_BASE64, 'base64');
for (const slug of SLUGS) {
  fs.writeFileSync(path.join(outDir, `${slug}.png`), buf);
}
console.log(`wrote ${SLUGS.length} placeholder PNGs to ${outDir}`);
