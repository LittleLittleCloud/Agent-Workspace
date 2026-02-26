/**
 * Claude Multi-Skill Orchestration — Combines multiple "skills" (coding,
 * research, DevOps) into a single agentic loop so Claude can pick the right
 * tool for each sub-task.
 *
 * This example shows how a higher-level agent can scaffold a project end-to-end:
 *   1. Research a topic (grep, tree, read)
 *   2. Write code (write_file)
 *   3. Install dependencies (bash)
 *   4. Run tests & iterate (bash + read_file)
 *   5. Package / summarise results
 *
 * Run:
 *   npx tsx examples/claude-multi-skill.ts
 *
 * Requires:
 *   AW_API_KEY       — your API key
 *   AW_WORKSPACE_ID  — an active workspace id (already attached to a VM)
 *   ANTHROPIC_API_KEY — Anthropic API key for Claude
 */

import Anthropic from '@anthropic-ai/sdk'
import { WorkspaceClient } from '@agent-workspace/sdk'

const anthropic = new Anthropic()
const client = new WorkspaceClient({ apiKey: process.env.AW_API_KEY! })
const ws = client.workspace(process.env.AW_WORKSPACE_ID!)

// ── Combined tool set from multiple skills ────────────────────────────────
//
// In a real system you might dynamically compose these from a skill registry.
// Here we inline them for clarity.

const allTools: Anthropic.Tool[] = [
  // ── Coding skill ─────────────────────────────────────────────────────
  {
    name: 'write_file',
    description: 'Write content to a file in the workspace. Creates parent directories.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string' },
        content: { type: 'string' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'read_file',
    description: 'Read a file from the workspace.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string' },
      },
      required: ['path'],
    },
  },

  // ── Research / exploration skill ─────────────────────────────────────
  {
    name: 'tree',
    description: 'Show the workspace directory tree.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'Root path (default: /)' },
        depth: { type: 'number', description: 'Max depth (default: 3)' },
      },
    },
  },
  {
    name: 'grep',
    description: 'Search for a regex pattern across workspace files.',
    input_schema: {
      type: 'object' as const,
      properties: {
        pattern: { type: 'string' },
        include: { type: 'string', description: 'Glob filter (default: **/*)' },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'find_files',
    description: 'Find files by name or glob pattern.',
    input_schema: {
      type: 'object' as const,
      properties: {
        pattern: { type: 'string' },
        type: { type: 'string', enum: ['file', 'dir'] },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'list_files',
    description: 'List entries in a directory.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'Directory to list (default: /)' },
        recursive: { type: 'boolean' },
      },
    },
  },

  // ── DevOps / shell skill ─────────────────────────────────────────────
  {
    name: 'bash',
    description:
      'Run any bash command. Use for: git, npm/pip install, running tests, ' +
      'building, curl, jq, etc. Timeout: 120s.',
    input_schema: {
      type: 'object' as const,
      properties: {
        command: { type: 'string' },
        cwd: { type: 'string', description: 'Working directory (default: /)' },
      },
      required: ['command'],
    },
  },
]

// ── Unified dispatcher ────────────────────────────────────────────────────

async function dispatchTool(name: string, input: Record<string, unknown>): Promise<string> {
  switch (name) {
    case 'write_file': {
      await ws.files.write(input.path as string, input.content as string)
      return `Wrote ${(input.content as string).length} chars → ${input.path}`
    }
    case 'read_file':
      return await ws.files.read(input.path as string)
    case 'tree':
      return await ws.tools.tree({
        path: (input.path as string) ?? '/',
        depth: (input.depth as number) ?? 3,
      })
    case 'grep': {
      const r = await ws.tools.grep(input.pattern as string, {
        include: (input.include as string) ?? '**/*',
      })
      const lines = r.matches.map(m => `${m.file}:${m.line}  ${m.content.trim()}`)
      if (r.truncated) lines.push('... (truncated)')
      return lines.join('\n') || 'No matches.'
    }
    case 'find_files':
      return (await ws.tools.find(input.pattern as string, {
        type: input.type as 'file' | 'dir' | undefined,
      })).join('\n')
    case 'list_files': {
      const entries = await ws.files.list(
        (input.path as string) ?? '/',
        { recursive: (input.recursive as boolean) ?? false },
      )
      return entries.map(e => `${e.type === 'dir' ? '📁' : '📄'} ${e.path}`).join('\n')
    }
    case 'bash': {
      const r = await ws.tools.bash(input.command as string, {
        cwd: (input.cwd as string) ?? '/',
        timeoutMs: 120_000,
      })
      return [
        `exit code: ${r.exitCode}`,
        r.stdout ? `stdout:\n${r.stdout}` : '',
        r.stderr ? `stderr:\n${r.stderr}` : '',
      ].filter(Boolean).join('\n')
    }
    default:
      return `Unknown tool: ${name}`
  }
}

// ── Agentic loop ──────────────────────────────────────────────────────────

const MAX_ITERATIONS = 20

async function main() {
  const task = `
    Build a Node.js CLI tool that fetches the top 5 Hacker News stories (use the
    HN Algolia API: https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=5)
    and prints them as a formatted table.

    Steps:
    1. Initialise a Node project with TypeScript.
    2. Write the code in src/index.ts.
    3. Install any needed dependencies.
    4. Run it and verify the output looks correct.
    5. Write a test that mocks the fetch call and asserts the formatting, then
       make sure the test passes.
    6. Show me the final directory tree and the test output.
  `.trim()

  console.log(`Task:\n${task}\n`)

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: task },
  ]

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    console.log(`\n── Iteration ${i + 1} ──`)

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system:
        'You are an expert full-stack developer with DevOps skills. You have access to a sandboxed ' +
        'workspace with bash, file I/O, and search tools. Complete the task step-by-step. ' +
        'Use tree/find to orient. Use bash for git, npm, running code. Use write_file/read_file ' +
        'for code. Be precise — iterate until everything works.',
      tools: allTools,
      messages,
    })

    messages.push({ role: 'assistant', content: response.content })

    // Print any text reasoning
    for (const block of response.content) {
      if (block.type === 'text' && block.text.trim()) {
        console.log(`Claude: ${block.text.substring(0, 200)}${block.text.length > 200 ? '...' : ''}`)
      }
    }

    if (response.stop_reason === 'end_turn') {
      break
    }

    // Dispatch tool calls
    const toolResults: Anthropic.ToolResultBlockParam[] = []
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue
      const inputPreview = JSON.stringify(block.input).substring(0, 80)
      console.log(`  → ${block.name}(${inputPreview}...)`)

      const result = await dispatchTool(block.name, block.input as Record<string, unknown>)
      const preview = result.substring(0, 150).replace(/\n/g, ' ')
      console.log(`    ${preview}${result.length > 150 ? '...' : ''}`)

      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
    }

    messages.push({ role: 'user', content: toolResults })
  }

  console.log('\n✅ Multi-skill session complete')
}

main().catch(console.error)
