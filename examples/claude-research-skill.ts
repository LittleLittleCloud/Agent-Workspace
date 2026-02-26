/**
 * Claude Research Skill — Clone a repository into the workspace, then let
 * Claude explore it with grep, tree, file reads, and bash to answer a
 * research question.
 *
 * Run:
 *   npx tsx examples/claude-research-skill.ts
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

// ── Skill definition: "research" ──────────────────────────────────────────
// A read-heavy tool set designed for exploring and understanding code.

const researchTools: Anthropic.Tool[] = [
  {
    name: 'bash',
    description:
      'Run a bash command. Useful for git clone, wc, head/tail, jq, etc. ' +
      'The workspace has git, curl, jq, and common CLI tools pre-installed.',
    input_schema: {
      type: 'object' as const,
      properties: {
        command: { type: 'string', description: 'Bash command to execute' },
      },
      required: ['command'],
    },
  },
  {
    name: 'tree',
    description: 'Show the directory tree. Great for getting oriented in a new codebase.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'Root path (default: /)' },
        depth: { type: 'number', description: 'Max depth (default: 3)' },
      },
    },
  },
  {
    name: 'read_file',
    description: 'Read the full contents of a file.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string' },
      },
      required: ['path'],
    },
  },
  {
    name: 'grep',
    description:
      'Search for a pattern across files. Returns file, line number, and matching line.',
    input_schema: {
      type: 'object' as const,
      properties: {
        pattern: { type: 'string', description: 'Regex pattern to search for' },
        include: { type: 'string', description: 'Glob filter, e.g. **/*.py (default: **/*)' },
        caseSensitive: { type: 'boolean', description: 'Default: false' },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'find',
    description: 'Find files by name or glob pattern.',
    input_schema: {
      type: 'object' as const,
      properties: {
        pattern: { type: 'string', description: 'Glob pattern, e.g. *.py' },
        type: { type: 'string', enum: ['file', 'dir'], description: 'Filter by type' },
        cwd: { type: 'string', description: 'Search root (default: /)' },
      },
      required: ['pattern'],
    },
  },
]

// ── Tool dispatcher ───────────────────────────────────────────────────────

async function dispatchTool(name: string, input: Record<string, unknown>): Promise<string> {
  switch (name) {
    case 'bash': {
      const r = await ws.tools.bash(input.command as string, { timeoutMs: 120_000 })
      return [
        `exit code: ${r.exitCode}`,
        r.stdout ? `stdout:\n${r.stdout}` : '',
        r.stderr ? `stderr:\n${r.stderr}` : '',
      ].filter(Boolean).join('\n')
    }
    case 'tree':
      return await ws.tools.tree({
        path: (input.path as string) ?? '/',
        depth: (input.depth as number) ?? 3,
      })
    case 'read_file':
      return await ws.files.read(input.path as string)
    case 'grep': {
      const r = await ws.tools.grep(input.pattern as string, {
        include: (input.include as string) ?? '**/*',
        caseSensitive: (input.caseSensitive as boolean) ?? false,
      })
      const lines = r.matches.map(m => `${m.file}:${m.line}  ${m.content.trim()}`)
      if (r.truncated) lines.push('... (truncated)')
      return lines.join('\n') || 'No matches.'
    }
    case 'find':
      return (await ws.tools.find(input.pattern as string, {
        type: input.type as 'file' | 'dir' | undefined,
        cwd: (input.cwd as string) ?? '/',
      })).join('\n')
    default:
      return `Unknown tool: ${name}`
  }
}

// ── Agentic loop ──────────────────────────────────────────────────────────

const MAX_ITERATIONS = 15

async function main() {
  // The repo to research and the question to answer
  const REPO_URL = 'https://github.com/expressjs/express.git'
  const QUESTION = `
    Clone ${REPO_URL} (shallow, depth=1) and answer:
    1. How is the routing system organized? Which files define the Router?
    2. How does Express handle middleware chaining internally?
    3. What pattern does it use for error handling middleware?
    Give a concise architecture summary with the most important file paths.
  `.trim()

  console.log(`Research question:\n${QUESTION}\n`)

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: QUESTION },
  ]

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    console.log(`── Iteration ${i + 1} ──`)

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system:
        'You are a senior software architect. Use the provided tools to clone the repository, explore its ' +
        'structure, read key files, and answer the research question thoroughly. Be methodical: start with ' +
        'tree/find to orient, then read important files, then synthesize.',
      tools: researchTools,
      messages,
    })

    messages.push({ role: 'assistant', content: response.content })

    if (response.stop_reason === 'end_turn') {
      const textBlocks = response.content.filter(b => b.type === 'text')
      console.log('\n=== Research Findings ===\n')
      console.log(textBlocks.map(b => b.text).join('\n'))
      break
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = []
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue
      console.log(`  → ${block.name}(${JSON.stringify(block.input).substring(0, 80)}...)`)
      const result = await dispatchTool(block.name, block.input as Record<string, unknown>)
      const preview = result.substring(0, 150).replace(/\n/g, ' ')
      console.log(`    ${preview}${result.length > 150 ? '...' : ''}`)
      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
    }

    messages.push({ role: 'user', content: toolResults })
  }

  console.log('\n✅ Research skill session complete')
}

main().catch(console.error)
