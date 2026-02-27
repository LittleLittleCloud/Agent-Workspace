import { describe, it, expect, vi } from 'vitest'

// Mock the db module so the test doesn't require real Supabase credentials
vi.mock('../db/client', () => ({
  db: {},
  setOrgContext: vi.fn(),
}))

import { generateApiKey, hashApiKey } from './auth'

describe('generateApiKey', () => {
  it('returns a string with the aw_sk_ prefix', () => {
    const key = generateApiKey()
    expect(key).toMatch(/^aw_sk_/)
  })

  it('returns a key of consistent length', () => {
    const key = generateApiKey()
    // prefix (6) + 40 random chars = 46
    expect(key.length).toBe(46)
  })

  it('generates unique keys on each call', () => {
    const keys = new Set(Array.from({ length: 20 }, () => generateApiKey()))
    expect(keys.size).toBe(20)
  })
})

describe('hashApiKey', () => {
  it('returns a non-empty hash string', async () => {
    const key = generateApiKey()
    const hash = await hashApiKey(key)
    expect(typeof hash).toBe('string')
    expect(hash.length).toBeGreaterThan(0)
  })

  it('returns a different value from the original key', async () => {
    const key = generateApiKey()
    const hash = await hashApiKey(key)
    expect(hash).not.toBe(key)
  })
})
