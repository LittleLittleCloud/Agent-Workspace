/**
 * Fly.io Machines API client.
 *
 * Manages creating, starting, stopping, and destroying Fly Machines
 * that serve as workspace compute VMs.
 */

const FLY_API_BASE = 'https://api.machines.dev/v1'
const FLY_APP_NAME = process.env.FLY_APP_NAME ?? 'agent-workspace-vms'

interface FlyMachineConfig {
  image: string
  guest: { cpus: number; memory_mb: number }
  env: Record<string, string>
}

interface FlyMachine {
  id: string
  name: string
  state: string
  region: string
  instance_id: string
  private_ip: string
}

function headers(): HeadersInit {
  return {
    Authorization: `Bearer ${process.env.FLY_API_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

export async function createMachine(
  region: string,
  config: Partial<FlyMachineConfig> = {},
): Promise<FlyMachine> {
  const res = await fetch(`${FLY_API_BASE}/apps/${FLY_APP_NAME}/machines`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      region,
      config: {
        image: config.image ?? 'registry.fly.io/agent-workspace-vm:latest',
        guest: config.guest ?? { cpus: 1, memory_mb: 256 },
        env: config.env ?? {},
        auto_destroy: true,
      },
    }),
  })
  if (!res.ok) throw new Error(`Fly create machine failed: ${res.status} ${await res.text()}`)
  return res.json() as Promise<FlyMachine>
}

export async function startMachine(machineId: string): Promise<void> {
  const res = await fetch(
    `${FLY_API_BASE}/apps/${FLY_APP_NAME}/machines/${machineId}/start`,
    { method: 'POST', headers: headers() },
  )
  if (!res.ok) throw new Error(`Fly start machine failed: ${res.status}`)
}

export async function stopMachine(machineId: string): Promise<void> {
  const res = await fetch(
    `${FLY_API_BASE}/apps/${FLY_APP_NAME}/machines/${machineId}/stop`,
    { method: 'POST', headers: headers() },
  )
  if (!res.ok) throw new Error(`Fly stop machine failed: ${res.status}`)
}

export async function destroyMachine(machineId: string): Promise<void> {
  const res = await fetch(
    `${FLY_API_BASE}/apps/${FLY_APP_NAME}/machines/${machineId}`,
    { method: 'DELETE', headers: headers() },
  )
  if (!res.ok) throw new Error(`Fly destroy machine failed: ${res.status}`)
}

export async function getMachine(machineId: string): Promise<FlyMachine> {
  const res = await fetch(
    `${FLY_API_BASE}/apps/${FLY_APP_NAME}/machines/${machineId}`,
    { headers: headers() },
  )
  if (!res.ok) throw new Error(`Fly get machine failed: ${res.status}`)
  return res.json() as Promise<FlyMachine>
}

export async function listMachines(): Promise<FlyMachine[]> {
  const res = await fetch(
    `${FLY_API_BASE}/apps/${FLY_APP_NAME}/machines`,
    { headers: headers() },
  )
  if (!res.ok) throw new Error(`Fly list machines failed: ${res.status}`)
  return res.json() as Promise<FlyMachine[]>
}

/**
 * Get the private IP of a machine for internal .fly.dev network communication.
 */
export function machineInternalUrl(machine: FlyMachine, port = 8080): string {
  return `http://${machine.private_ip}:${port}`
}
