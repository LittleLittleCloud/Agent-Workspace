/**
 * File handlers — read, write, list, delete, move, copy, mkdir, exists, stat.
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import type { Context } from 'hono'
import { globMatch } from '../sandbox'

const WORKSPACE_ROOT = '/workspace'

function resolve(filePath: string): string {
  // Prevent path traversal outside workspace
  const resolved = path.resolve(WORKSPACE_ROOT, filePath.replace(/^\//, ''))
  if (!resolved.startsWith(WORKSPACE_ROOT)) {
    throw new Error('Path traversal not allowed')
  }
  return resolved
}

async function fileEntry(filePath: string) {
  const stat = await fs.stat(filePath)
  return {
    path: path.relative(WORKSPACE_ROOT, filePath),
    type: stat.isDirectory() ? 'dir' : stat.isSymbolicLink() ? 'symlink' : 'file',
    size: stat.size,
    modifiedAt: stat.mtime.toISOString(),
  }
}

// ── List files ─────────────────────────────────────────────────────────────

export async function listHandler(c: Context) {
  const dirPath = c.req.query('path') ?? '/'
  const recursive = c.req.query('recursive') === 'true'
  const pattern = c.req.query('pattern')

  const resolved = resolve(dirPath)
  const entries = await fs.readdir(resolved, { withFileTypes: true, recursive })

  const results = []
  for (const entry of entries) {
    const fullPath = path.join(entry.parentPath ?? resolved, entry.name)
    const relPath = path.relative(WORKSPACE_ROOT, fullPath)

    if (pattern && !globMatch(relPath, pattern)) continue

    const stat = await fs.stat(fullPath)
    results.push({
      path: relPath,
      type: entry.isDirectory() ? 'dir' : entry.isSymbolicLink() ? 'symlink' : 'file',
      size: stat.size,
      modifiedAt: stat.mtime.toISOString(),
    })
  }

  return c.json(results)
}

// ── Read file ──────────────────────────────────────────────────────────────

export async function readHandler(c: Context) {
  const filePath = c.req.query('path')
  const encoding = (c.req.query('encoding') ?? 'utf-8') as BufferEncoding

  if (!filePath) return c.json({ error: 'path is required' }, 400)

  const resolved = resolve(filePath)
  const content = await fs.readFile(resolved, { encoding })
  return c.json({ content })
}

// ── Write file ─────────────────────────────────────────────────────────────

export async function writeHandler(c: Context) {
  const body = await c.req.json<{
    path: string
    content: string
    append?: boolean
    mkdirp?: boolean
  }>()

  if (!body.path || body.content === undefined) {
    return c.json({ error: 'path and content are required' }, 400)
  }

  const resolved = resolve(body.path)

  if (body.mkdirp !== false) {
    await fs.mkdir(path.dirname(resolved), { recursive: true })
  }

  if (body.append) {
    await fs.appendFile(resolved, body.content, 'utf-8')
  } else {
    await fs.writeFile(resolved, body.content, 'utf-8')
  }

  return c.json(await fileEntry(resolved))
}

// ── Delete file/dir ────────────────────────────────────────────────────────

export async function deleteHandler(c: Context) {
  const body = await c.req.json<{ path: string; recursive?: boolean }>()
  if (!body.path) return c.json({ error: 'path is required' }, 400)

  const resolved = resolve(body.path)
  await fs.rm(resolved, { recursive: body.recursive ?? false, force: true })

  return c.json({ ok: true })
}

// ── Move ───────────────────────────────────────────────────────────────────

export async function moveHandler(c: Context) {
  const body = await c.req.json<{ from: string; to: string }>()
  if (!body.from || !body.to) return c.json({ error: 'from and to are required' }, 400)

  const from = resolve(body.from)
  const to = resolve(body.to)
  await fs.mkdir(path.dirname(to), { recursive: true })
  await fs.rename(from, to)

  return c.json(await fileEntry(to))
}

// ── Copy ───────────────────────────────────────────────────────────────────

export async function copyHandler(c: Context) {
  const body = await c.req.json<{ from: string; to: string }>()
  if (!body.from || !body.to) return c.json({ error: 'from and to are required' }, 400)

  const from = resolve(body.from)
  const to = resolve(body.to)
  await fs.mkdir(path.dirname(to), { recursive: true })
  await fs.cp(from, to, { recursive: true })

  return c.json(await fileEntry(to))
}

// ── Mkdir ──────────────────────────────────────────────────────────────────

export async function mkdirHandler(c: Context) {
  const body = await c.req.json<{ path: string }>()
  if (!body.path) return c.json({ error: 'path is required' }, 400)

  const resolved = resolve(body.path)
  await fs.mkdir(resolved, { recursive: true })

  return c.json(await fileEntry(resolved))
}

// ── Exists ─────────────────────────────────────────────────────────────────

export async function existsHandler(c: Context) {
  const filePath = c.req.query('path')
  if (!filePath) return c.json({ error: 'path is required' }, 400)

  try {
    await fs.access(resolve(filePath))
    return c.json({ exists: true })
  } catch {
    return c.json({ exists: false })
  }
}

// ── Stat ───────────────────────────────────────────────────────────────────

export async function statHandler(c: Context) {
  const filePath = c.req.query('path')
  if (!filePath) return c.json({ error: 'path is required' }, 400)

  return c.json(await fileEntry(resolve(filePath)))
}
