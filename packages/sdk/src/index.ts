export { WorkspaceClient, WorkspaceHandle } from './client'
export { WorkspaceResource } from './workspace'
export { FilesResource } from './files'
export { ToolsResource } from './tools'

export {
  AgentWorkspaceError, AuthError, ForbiddenError, NotFoundError,
  ConflictError, ValidationError, TimeoutError, ServerError,
} from './errors'

export type {
  Org, ApiKey,
  Workspace, WorkspaceStatus, CreateWorkspaceOptions, UpdateWorkspaceOptions, AttachOptions,
  Vm, VmStatus,
  FileEntry, ReadFileOptions, WriteFileOptions, ListFilesOptions,
  BashOptions, BashResult, GrepOptions, GrepMatch, GrepResult,
  WorkspaceClientOptions, PaginatedList, PaginationOptions,
} from './types'
