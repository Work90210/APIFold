/**
 * Submit all marketplace URLs to IndexNow (Bing, Yandex, DuckDuckGo, Naver).
 * IndexNow processes URLs within hours, not weeks.
 *
 * Usage: DATABASE_URL=... DATABASE_SSL=true npx tsx apps/web/scripts/submit-indexnow.ts
 */
import postgres from 'postgres';

const INDEXNOW_KEY = 'd413c1f90f75410b45577c780ed261ad';
const BASE_URL = 'https://apifold.dev';
const BATCH_SIZE = 100; // IndexNow allows up to 10,000 per request

async function main() {
  const url = process.env['DATABASE_URL'];
  if (!url) throw new Error('DATABASE_URL required');

  const needsSsl = process.env['DATABASE_SSL'] === 'true';
  const sql = postgres(url, {
    ssl: needsSsl
      ? { rejectUnauthorized: process.env['DATABASE_SSL_REJECT_UNAUTHORIZED'] !== 'false' }
      : false,
  });

  // Gather all URLs
  const urls: string[] = [
    BASE_URL,
    `${BASE_URL}/marketplace`,
    `${BASE_URL}/pricing`,
    `${BASE_URL}/docs`,
  ];

  const listings = await sql`
    SELECT slug FROM marketplace_listings WHERE status = 'published' ORDER BY featured DESC, install_count DESC
  `;
  for (const row of listings) {
    urls.push(`${BASE_URL}/marketplace/${row.slug}`);
  }

  console.log(`Submitting ${urls.length} URLs to IndexNow...`);

  // Submit in batches
  let submitted = 0;
  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    const body = {
      host: 'apifold.dev',
      key: INDEXNOW_KEY,
      keyLocation: `${BASE_URL}/${INDEXNOW_KEY}.txt`,
      urlList: batch,
    };

    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    submitted += batch.length;
    console.log(`[${submitted}/${urls.length}] HTTP ${res.status} (${res.statusText})`);
  }

  console.log(`\nDone. ${submitted} URLs submitted to IndexNow.`);
  console.log('Bing, Yandex, DuckDuckGo, and Naver will process these within hours.');
  await sql.end();
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
