import { describe, it, expect } from 'vitest'
import {
  AgentWorkspaceError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  TimeoutError,
  ServerError,
  mapApiError,
} from './errors'

describe('AgentWorkspaceError', () => {
  it('sets message, code and statusCode', () => {
    const err = new AgentWorkspaceError('oops', 'MY_CODE', 418)
    expect(err.message).toBe('oops')
    expect(err.code).toBe('MY_CODE')
    expect(err.statusCode).toBe(418)
    expect(err.name).toBe('AgentWorkspaceError')
    expect(err).toBeInstanceOf(Error)
  })
})

describe('AuthError', () => {
  it('uses default message and 401 status', () => {
    const err = new AuthError()
    expect(err.statusCode).toBe(401)
    expect(err.name).toBe('AuthError')
    expect(err.message).toBe('Invalid or missing API key')
  })

  it('accepts a custom message', () => {
    const err = new AuthError('Token expired')
    expect(err.message).toBe('Token expired')
  })
})

describe('ForbiddenError', () => {
  it('has 403 status and default message', () => {
    const err = new ForbiddenError()
    expect(err.statusCode).toBe(403)
    expect(err.name).toBe('ForbiddenError')
  })
})

describe('NotFoundError', () => {
  it('formats the message from resource and id', () => {
    const err = new NotFoundError('Workspace', 'ws-123')
    expect(err.message).toBe("Workspace 'ws-123' not found")
    expect(err.statusCode).toBe(404)
    expect(err.name).toBe('NotFoundError')
  })
})

describe('ConflictError', () => {
  it('has 409 status', () => {
    const err = new ConflictError('already exists')
    expect(err.statusCode).toBe(409)
    expect(err.name).toBe('ConflictError')
  })
})

describe('ValidationError', () => {
  it('has 422 status and optional fields', () => {
    const err = new ValidationError('bad input', { name: 'required' })
    expect(err.statusCode).toBe(422)
    expect(err.name).toBe('ValidationError')
    expect(err.fields).toEqual({ name: 'required' })
  })

  it('works without fields', () => {
    const err = new ValidationError('bad input')
    expect(err.fields).toBeUndefined()
  })
})

describe('TimeoutError', () => {
  it('has 408 status and default message', () => {
    const err = new TimeoutError()
    expect(err.statusCode).toBe(408)
    expect(err.name).toBe('TimeoutError')
    expect(err.message).toBe('Request timed out')
  })

  it('accepts a custom message', () => {
    const err = new TimeoutError('too slow')
    expect(err.message).toBe('too slow')
  })
})

describe('ServerError', () => {
  it('has 500 status and default message', () => {
    const err = new ServerError()
    expect(err.statusCode).toBe(500)
    expect(err.name).toBe('ServerError')
  })

  it('accepts custom status codes', () => {
    const err = new ServerError('gateway error', 502)
    expect(err.statusCode).toBe(502)
  })
})

describe('mapApiError', () => {
  it('maps 401 to AuthError', () => {
    const err = mapApiError(401, { error: 'bad token' })
    expect(err).toBeInstanceOf(AuthError)
    expect(err.message).toBe('bad token')
  })

  it('maps 403 to ForbiddenError', () => {
    const err = mapApiError(403, { message: 'nope' })
    expect(err).toBeInstanceOf(ForbiddenError)
    expect(err.message).toBe('nope')
  })

  it('maps 404 with NOT_FOUND code', () => {
    const err = mapApiError(404, { error: 'missing' })
    expect(err.code).toBe('NOT_FOUND')
    expect(err.statusCode).toBe(404)
  })

  it('maps 409 to ConflictError', () => {
    const err = mapApiError(409, { error: 'conflict' })
    expect(err).toBeInstanceOf(ConflictError)
  })

  it('maps 422 to ValidationError with fields', () => {
    const err = mapApiError(422, { error: 'invalid', fields: { name: 'too short' } })
    expect(err).toBeInstanceOf(ValidationError)
    expect((err as ValidationError).fields).toEqual({ name: 'too short' })
  })

  it('maps 5xx to ServerError', () => {
    const err = mapApiError(503, { error: 'unavailable' })
    expect(err).toBeInstanceOf(ServerError)
    expect(err.statusCode).toBe(503)
  })

  it('uses unknown error when body has no message', () => {
    const err = mapApiError(500, {})
    expect(err.message).toBe('Unknown error')
  })
})
