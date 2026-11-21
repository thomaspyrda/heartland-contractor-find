import { readFile, access } from 'node:fs/promises';
try {
  const config = JSON.parse(await readFile(new URL('../wrangler.json',import.meta.url),'utf8'));
  if (!config.d1_databases?.[0]?.database_id || !config.r2_buckets?.[0]?.bucket_name) throw new Error('bindings');
  await access(new URL('../dist/index.html',import.meta.url));
} catch {
  console.error('Run npm run build and npm run configure with the real D1 database ID before deployment.');
  process.exit(1);
}
