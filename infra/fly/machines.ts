/**
 * Fly Machine template management.
 *
 * Scripts for building, pushing, and configuring the sandbox VM image
 * on Fly.io Machines.
 */

const FLY_APP_NAME = process.env.FLY_APP_NAME ?? 'agent-workspace-vms'
const FLY_ORG = process.env.FLY_ORG ?? 'personal'

async function run(cmd: string) {
  const { execSync } = await import('node:child_process')
  console.log(`$ ${cmd}`)
  execSync(cmd, { stdio: 'inherit' })
}

async function buildAndPush() {
  console.log('Building sandbox VM image...')
  await run(`docker build -t registry.fly.io/${FLY_APP_NAME}:latest -f infra/fly/vm-image/Dockerfile .`)
  console.log('Pushing to Fly registry...')
  await run(`flyctl auth docker`)
  await run(`docker push registry.fly.io/${FLY_APP_NAME}:latest`)
  console.log('Done.')
}

async function createApp() {
  console.log(`Creating Fly app '${FLY_APP_NAME}'...`)
  await run(`flyctl apps create ${FLY_APP_NAME} --org ${FLY_ORG} --machines`)
  console.log('Done.')
}

// ── CLI ────────────────────────────────────────────────────────────────────

const command = process.argv[2]

switch (command) {
  case 'build':
    buildAndPush()
    break
  case 'create-app':
    createApp()
    break
  default:
    console.log('Usage: tsx infra/fly/machines.ts <build|create-app>')
    process.exit(1)
}
