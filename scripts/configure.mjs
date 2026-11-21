import { writeFile } from 'node:fs/promises';

const databaseID = process.argv[2] || process.env.CLOUDFLARE_D1_DATABASE_ID;
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(databaseID || '')) {
  console.error('Provide the real D1 database ID: npm run configure -- <database-id>, or set CLOUDFLARE_D1_DATABASE_ID in the build environment.');
  process.exit(1);
}
const config = {
  name: 'heartland-contractor-find',
  main: 'src/worker.mjs',
  compatibility_date: '2026-11-20',
  workers_dev: true,
  assets: { directory: './dist', binding: 'ASSETS', not_found_handling: '404-page', run_worker_first: ['/api/*'] },
  d1_databases: [{ binding: 'DB', database_name: 'heartland-inquiries', database_id: databaseID, migrations_dir: 'migrations' }],
  r2_buckets: [{ binding: 'PHOTOS', bucket_name: process.env.PHOTO_BUCKET_NAME || 'heartland-inquiry-photos' }],
  triggers: { crons: ['*/15 * * * *'] },
  keep_vars: true
};
// Runtime secrets are configured in Cloudflare. Never write notification addresses or API credentials here.
await writeFile(new URL('../wrangler.json',import.meta.url),JSON.stringify(config,null,2)+'\n');
console.log('Wrote wrangler.json using the supplied database ID. No runtime secrets were written.');
