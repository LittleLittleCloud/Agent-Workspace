export class AgentWorkspaceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
  ) {
    super(message)
    this.name = 'AgentWorkspaceError'
  }
}

export class AuthError extends AgentWorkspaceError {
  constructor(message = 'Invalid or missing API key') {
    super(message, 'AUTH_ERROR', 401)
    this.name = 'AuthError'
  }
}

export class ForbiddenError extends AgentWorkspaceError {
  constructor(message = 'You do not have access to this resource') {
    super(message, 'FORBIDDEN', 403)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends AgentWorkspaceError {
  constructor(resource: string, id: string) {
    super(`${resource} '${id}' not found`, 'NOT_FOUND', 404)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends AgentWorkspaceError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409)
    this.name = 'ConflictError'
  }
}

export class ValidationError extends AgentWorkspaceError {
  constructor(message: string, public readonly fields?: Record<string, string>) {
    super(message, 'VALIDATION_ERROR', 422)
    this.name = 'ValidationError'
  }
}

export class TimeoutError extends AgentWorkspaceError {
  constructor(message = 'Request timed out') {
    super(message, 'TIMEOUT', 408)
    this.name = 'TimeoutError'
  }
}

export class ServerError extends AgentWorkspaceError {
  constructor(message = 'An unexpected server error occurred', statusCode = 500) {
    super(message, 'SERVER_ERROR', statusCode)
    this.name = 'ServerError'
  }
}

export function mapApiError(
  statusCode: number,
  body: { error?: string; message?: string; fields?: Record<string, string> }
): AgentWorkspaceError {
  const message = body.error ?? body.message ?? 'Unknown error'
  switch (statusCode) {
    case 401: return new AuthError(message)
    case 403: return new ForbiddenError(message)
    case 404: return new AgentWorkspaceError(message, 'NOT_FOUND', 404)
    case 409: return new ConflictError(message)
    case 422: return new ValidationError(message, body.fields)
    default:  return statusCode >= 500
      ? new ServerError(message, statusCode)
      : new AgentWorkspaceError(message, 'CLIENT_ERROR', statusCode)
  }
}
