/**
 * S3 bucket provisioning script.
 *
 * Supports Tigris (Fly.io), Cloudflare R2, and AWS S3.
 * Run with: npx tsx infra/storage/buckets.ts <provider>
 */

async function run(cmd: string) {
  const { execSync } = await import('node:child_process')
  console.log(`$ ${cmd}`)
  execSync(cmd, { stdio: 'inherit' })
}

async function provisionTigris() {
  const bucketName = process.env.S3_BUCKET ?? 'agent-workspace'
  console.log(`Provisioning Tigris bucket: ${bucketName}`)
  await run(`flyctl storage create --name ${bucketName}`)
  console.log(`
Tigris bucket created. Add these to your .env:
  S3_ENDPOINT=https://fly.storage.tigris.dev
  S3_BUCKET=${bucketName}
  S3_ACCESS_KEY_ID=<from flyctl storage credentials>
  S3_SECRET_ACCESS_KEY=<from flyctl storage credentials>
`)
}

async function provisionR2() {
  console.log('To provision Cloudflare R2:')
  console.log('  1. Go to Cloudflare Dashboard → R2')
  console.log('  2. Create a bucket named "agent-workspace"')
  console.log('  3. Generate S3-compatible API tokens')
  console.log('  4. Set S3_ENDPOINT to your R2 endpoint')
}

async function provisionAWS() {
  const bucketName = process.env.S3_BUCKET ?? 'agent-workspace'
  console.log(`Creating AWS S3 bucket: ${bucketName}`)
  await run(`aws s3 mb s3://${bucketName} --region us-east-1`)
  console.log(`
AWS S3 bucket created. Add these to your .env:
  S3_ENDPOINT=https://s3.us-east-1.amazonaws.com
  S3_BUCKET=${bucketName}
  S3_ACCESS_KEY_ID=<your AWS key>
  S3_SECRET_ACCESS_KEY=<your AWS secret>
`)
}

// ── CLI ────────────────────────────────────────────────────────────────────

const provider = process.argv[2]

switch (provider) {
  case 'tigris':
    provisionTigris()
    break
  case 'r2':
    provisionR2()
    break
  case 'aws':
    provisionAWS()
    break
  default:
    console.log('Usage: npx tsx infra/storage/buckets.ts <tigris|r2|aws>')
    process.exit(1)
}
