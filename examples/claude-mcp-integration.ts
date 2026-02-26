/**
 * Claude MCP Integration — Wires Agent Workspace SDK tools to an MCP server
 * so Claude (or any MCP-compatible model) can use bash, file, and search tools
 * backed by a real workspace sandbox.
 *
 * Run:
 *   npx tsx examples/claude-mcp-integration.ts
 *
 * Requires:
 *   AW_API_KEY       — your API key
 *   AW_WORKSPACE_ID  — an active workspace id (already attached to a VM)
 *
 * This example defines MCP tool schemas and shows how to dispatch tool calls
 * from a model to the Agent Workspace SDK. Integrate this into your MCP server
 * implementation.
 */

import { WorkspaceClient, type BashResult, type GrepResult } from '@agent-workspace/sdk'

const client = new WorkspaceClient({
  apiKey: process.env.AW_API_KEY!,
})

const ws = client.workspace(process.env.AW_WORKSPACE_ID!)

// ── MCP Tool Definitions ──────────────────────────────────────────────────

const tools = [
  {
    name: 'bash',
    description: 'Execute a bash command in the workspace sandbox. Returns stdout, stderr, and exit code.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        command: { type: 'string', description: 'The bash command to run' },
        cwd: { type: 'string', description: 'Working directory (default: /)' },
        timeoutMs: { type: 'number', description: 'Timeout in ms (default: 30000)' },
      },
      required: ['command'],
    },
  },
  {
    name: 'read_file',
    description: 'Read the contents of a file in the workspace.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'Absolute path to the file' },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'Write content to a file in the workspace. Creates parent directories automatically.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'Absolute path to the file' },
        content: { type: 'string', description: 'File content to write' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'list_files',
    description: 'List files and directories at a path in the workspace.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'Directory path to list (default: /)' },
        recursive: { type: 'boolean', description: 'List recursively (default: false)' },
        pattern: { type: 'string', description: 'Glob pattern filter, e.g. **/*.ts' },
      },
    },
  },
  {
    name: 'grep',
    description: 'Search for a regex pattern across files in the workspace.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        pattern: { type: 'string', description: 'Regex pattern to search for' },
        include: { type: 'string', description: 'Glob pattern for files to search (default: **/*)' },
        caseSensitive: { type: 'boolean', description: 'Case-sensitive search (default: false)' },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'tree',
    description: 'Get a tree view of the workspace directory structure.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'Root path for the tree (default: /)' },
        depth: { type: 'number', description: 'Max depth (default: 3)' },
      },
    },
  },
]

// ── Tool Dispatcher ────────────────────────────────────────────────────────

type ToolInput = Record<string, unknown>

async function handleToolCall(name: string, input: ToolInput): Promise<string> {
  switch (name) {
    case 'bash': {
      const result: BashResult = await ws.tools.bash(
        input.command as string,
        {
          cwd: (input.cwd as string) ?? '/',
          timeoutMs: (input.timeoutMs as number) ?? 30_000,
        },
      )
      return [
        `exit code: ${result.exitCode}`,
        result.stdout ? `stdout:\n${result.stdout}` : '',
        result.stderr ? `stderr:\n${result.stderr}` : '',
      ].filter(Boolean).join('\n')
    }

    case 'read_file': {
      return await ws.files.read(input.path as string)
    }

    case 'write_file': {
      await ws.files.write(input.path as string, input.content as string)
      return `Wrote ${(input.content as string).length} bytes to ${input.path}`
    }

    case 'list_files': {
      const entries = await ws.files.list(
        (input.path as string) ?? '/',
        {
          recursive: (input.recursive as boolean) ?? false,
          pattern: input.pattern as string,
        },
      )
      return entries.map(e => `${e.type === 'dir' ? '📁' : '📄'} ${e.path} (${e.size}B)`).join('\n')
    }

    case 'grep': {
      const result: GrepResult = await ws.tools.grep(
        input.pattern as string,
        {
          include: (input.include as string) ?? '**/*',
          caseSensitive: (input.caseSensitive as boolean) ?? false,
        },
      )
      const lines = result.matches.map(m => `${m.file}:${m.line}  ${m.content.trim()}`)
      if (result.truncated) lines.push('... (results truncated)')
      return lines.join('\n') || 'No matches found.'
    }

    case 'tree': {
      return await ws.tools.tree({
        path: (input.path as string) ?? '/',
        depth: (input.depth as number) ?? 3,
      })
    }

    default:
      return `Unknown tool: ${name}`
  }
}

// ── Demo: simulate model calling tools ─────────────────────────────────────

async function main() {
  console.log('=== Available MCP tools ===')
  for (const tool of tools) {
    console.log(`  ${tool.name} — ${tool.description}`)
  }

  console.log('\n=== Simulated tool calls ===\n')

  // Simulate: model asks for a tree view to orient itself
  console.log('> tree({ depth: 2 })')
  console.log(await handleToolCall('tree', { depth: 2 }))

  // Simulate: model writes a file
  console.log('\n> write_file({ path: "/app.py", content: "print(\'hello\')" })')
  console.log(await handleToolCall('write_file', { path: '/app.py', content: "print('hello')" }))

  // Simulate: model runs the file
  console.log('\n> bash({ command: "python3 /app.py" })')
  console.log(await handleToolCall('bash', { command: 'python3 /app.py' }))
}

main().catch(console.error)
