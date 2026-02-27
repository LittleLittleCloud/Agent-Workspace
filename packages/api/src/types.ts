/**
 * Shared Hono context variable types for the Agent Workspace API.
 */

import type { WorkspaceRecord } from './services/registry'

export type AppVariables = {
  orgId: string
  keyId: string
  workspace: WorkspaceRecord
}
