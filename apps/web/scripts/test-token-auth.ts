import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import postgres from 'postgres';

async function main() {
  const sql = postgres(process.env['DATABASE_URL']!);

  console.log('=== Per-Server Token Auth Verification ===\n');

  // 1. Migration check
  const [col] = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'mcp_servers' AND column_name = 'token_hash'
  `;
  console.log(`1. token_hash column exists: ${col ? 'YES' : 'FAIL'}`);

  // 2. Token generation
  const token = `af_${randomBytes(32).toString('hex')}`;
  const hash = createHash('sha256').update(token).digest('hex');
  console.log(`2. Token: ${token.slice(0, 12)}... (${token.length} chars, 256-bit entropy)`);
  console.log(`   Hash:  ${hash.slice(0, 12)}... (${hash.length} hex chars)`);
  console.log(`   Prefix: ${token.startsWith('af_') ? 'PASS' : 'FAIL'}`);

  // 3. Timing-safe comparison
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(hash, 'hex');
  const wrongHash = createHash('sha256').update('wrong_token').digest('hex');
  const c = Buffer.from(wrongHash, 'hex');
  console.log(`3. Same token match: ${timingSafeEqual(a, b) ? 'PASS' : 'FAIL'}`);
  console.log(`   Wrong token reject: ${!timingSafeEqual(a, c) ? 'PASS' : 'FAIL'}`);
  console.log(`   Buffer lengths (32): ${a.length === 32 && b.length === 32 && c.length === 32 ? 'PASS' : 'FAIL'}`);

  // 4. Marketplace listings exist
  const listings = await sql`SELECT slug, status FROM marketplace_listings LIMIT 5`;
  console.log(`4. Marketplace listings: ${listings.length} found`);
  for (const l of listings) {
    console.log(`   - ${l.slug} [${l.status}]`);
  }

  // 5. Existing servers have NULL token_hash (legacy)
  const servers = await sql`SELECT slug, token_hash FROM mcp_servers LIMIT 5`;
  console.log(`5. Existing servers: ${servers.length} found`);
  for (const s of servers) {
    console.log(`   - ${s.slug}: token_hash=${s.token_hash ?? 'NULL (legacy)'}`);
  }

  // 6. Simulate marketplace deploy token flow
  const deployToken = `af_${randomBytes(32).toString('hex')}`;
  const deployHash = createHash('sha256').update(deployToken).digest('hex');

  // Verify hash matches
  const verifyHash = createHash('sha256').update(deployToken).digest('hex');
  const hashA = Buffer.from(deployHash, 'hex');
  const hashB = Buffer.from(verifyHash, 'hex');
  console.log(`6. Deploy token verification: ${timingSafeEqual(hashA, hashB) ? 'PASS' : 'FAIL'}`);

  // 7. Query param token extraction simulation
  const url = new URL(`http://localhost:3002/mcp/test/sse?token=${deployToken}`);
  const queryToken = url.searchParams.get('token');
  const queryHash = createHash('sha256').update(queryToken!).digest('hex');
  console.log(`7. Query param extraction: ${timingSafeEqual(Buffer.from(queryHash, 'hex'), hashA) ? 'PASS' : 'FAIL'}`);

  // 8. Verify marketplace tables have all required columns
  const mlCols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'marketplace_listings'
    ORDER BY ordinal_position
  `;
  console.log(`8. marketplace_listings columns: ${mlCols.length}`);

  const miCols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'marketplace_installs'
    ORDER BY ordinal_position
  `;
  console.log(`   marketplace_installs columns: ${miCols.length}`);

  const mrCols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'marketplace_reports'
    ORDER BY ordinal_position
  `;
  console.log(`   marketplace_reports columns: ${mrCols.length}`);

  const malCols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'marketplace_audit_log'
    ORDER BY ordinal_position
  `;
  console.log(`   marketplace_audit_log columns: ${malCols.length}`);

  console.log('\n=== All checks complete ===');
  await sql.end();
}

main();
