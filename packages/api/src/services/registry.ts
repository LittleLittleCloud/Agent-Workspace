/**
 * Registry — manages the workspace ↔ VM mapping in the database.
 *
 * Tracks which workspace is attached to which VM and manages state transitions.
 */

import { db, setOrgContext } from '../db/client'

export interface WorkspaceRecord {
  id: string
  org_id: string
  name: string
  s3_path: string
  status: string
  attached_vm_id: string | null
  created_at: string
  updated_at: string
}

export async function getWorkspace(
  orgId: string,
  workspaceId: string,
): Promise<WorkspaceRecord | null> {
  await setOrgContext(orgId)
  const { data, error } = await db
    .from('workspaces')
    .select('*')
    .eq('id', workspaceId)
    .single()

  if (error || !data) return null
  return data as WorkspaceRecord
}

export async function listWorkspaces(
  orgId: string,
  page = 1,
  pageSize = 25,
): Promise<{ data: WorkspaceRecord[]; total: number }> {
  await setOrgContext(orgId)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await db
    .from('workspaces')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw error
  return { data: (data ?? []) as WorkspaceRecord[], total: count ?? 0 }
}

export async function createWorkspace(
  orgId: string,
  name: string,
  s3Path: string,
): Promise<WorkspaceRecord> {
  await setOrgContext(orgId)
  const { data, error } = await db
    .from('workspaces')
    .insert({ org_id: orgId, name, s3_path: s3Path, status: 'idle' })
    .select()
    .single()

  if (error) throw error
  return data as WorkspaceRecord
}

export async function updateWorkspaceStatus(
  orgId: string,
  workspaceId: string,
  status: string,
  attachedVmId?: string | null,
): Promise<WorkspaceRecord> {
  await setOrgContext(orgId)
  const update: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }
  if (attachedVmId !== undefined) update.attached_vm_id = attachedVmId

  const { data, error } = await db
    .from('workspaces')
    .update(update)
    .eq('id', workspaceId)
    .select()
    .single()

  if (error) throw error
  return data as WorkspaceRecord
}

export async function updateWorkspaceName(
  orgId: string,
  workspaceId: string,
  name: string,
): Promise<WorkspaceRecord> {
  await setOrgContext(orgId)
  const { data, error } = await db
    .from('workspaces')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', workspaceId)
    .select()
    .single()

  if (error) throw error
  return data as WorkspaceRecord
}

export async function deleteWorkspaceRecord(
  orgId: string,
  workspaceId: string,
): Promise<void> {
  await setOrgContext(orgId)
  const { error } = await db
    .from('workspaces')
    .delete()
    .eq('id', workspaceId)

  if (error) throw error
}
