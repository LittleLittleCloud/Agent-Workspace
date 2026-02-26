/**
 * Claude Code Skill — An agentic coding loop where Claude writes code, runs
 * tests, reads errors, and iterates until tests pass, all inside an Agent
 * Workspace sandbox.
 *
 * Run:
 *   npx tsx examples/claude-code-skill.ts
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

// ── Skill definition: "code" ──────────────────────────────────────────────
// This is the set of tools we expose to Claude as a single "coding" skill.
// Each tool maps directly to an Agent Workspace SDK call.

const codeSkillTools: Anthropic.Tool[] = [
  {
    name: 'write_file',
    description: 'Write content to a file. Parent directories are created automatically.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'File path inside the workspace' },
        content: { type: 'string', description: 'Full file content' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'read_file',
    description: 'Read the contents of a file.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'File path inside the workspace' },
      },
      required: ['path'],
    },
  },
  {
    name: 'run_tests',
    description:
      'Run the test suite and return stdout/stderr/exit code. Use this to check whether your code works.',
    input_schema: {
      type: 'object' as const,
      properties: {
        command: {
          type: 'string',
          description: 'Test command to run, e.g. "npm test" or "pytest"',
        },
      },
      required: ['command'],
    },
  },
  {
    name: 'bash',
    description: 'Run an arbitrary bash command (install deps, inspect output, etc.).',
    input_schema: {
      type: 'object' as const,
      properties: {
        command: { type: 'string' },
      },
      required: ['command'],
    },
  },
]

// ── Tool dispatcher ───────────────────────────────────────────────────────

async function dispatchTool(name: string, input: Record<string, unknown>): Promise<string> {
  switch (name) {
    case 'write_file': {
      await ws.files.write(input.path as string, input.content as string)
      return `Wrote ${(input.content as string).length} chars to ${input.path}`
    }
    case 'read_file': {
      return await ws.files.read(input.path as string)
    }
    case 'run_tests':
    case 'bash': {
      const result = await ws.tools.bash(input.command as string, { timeoutMs: 60_000 })
      return [
        `exit code: ${result.exitCode}`,
        result.stdout ? `stdout:\n${result.stdout}` : '',
        result.stderr ? `stderr:\n${result.stderr}` : '',
      ].filter(Boolean).join('\n')
    }
    default:
      return `Unknown tool: ${name}`
  }
}

// ── Agentic loop ──────────────────────────────────────────────────────────

const MAX_ITERATIONS = 10

async function main() {
  const task = `
    Create a TypeScript module at src/math.ts that exports:
      - add(a, b) — returns a + b
      - subtract(a, b) — returns a - b
      - multiply(a, b) — returns a * b
      - divide(a, b) — returns a / b, throws if b is 0
    Then create src/math.test.ts with comprehensive tests using Node's built-in
    test runner (node:test + node:assert). Make sure all tests pass.
  `.trim()

  console.log(`Task: ${task}\n`)

  // Seed the workspace with package.json so "npm test" works
  await ws.tools.bash('npm init -y && npm pkg set scripts.test="node --test src/*.test.ts" && npm i -D typescript tsx', {
    timeoutMs: 60_000,
  })

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: task },
  ]

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    console.log(`── Iteration ${i + 1} ──`)

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system:
        'You are a senior developer. Use the provided tools to write code and tests inside the workspace. ' +
        'Iterate until all tests pass. Be concise in your reasoning.',
      tools: codeSkillTools,
      messages,
    })

    // Collect assistant message
    messages.push({ role: 'assistant', content: response.content })

    // If the model is done (no more tool use), break
    if (response.stop_reason === 'end_turn') {
      const textBlocks = response.content.filter(b => b.type === 'text')
      console.log('Claude:', textBlocks.map(b => b.text).join('\n'))
      break
    }

    // Process tool calls
    const toolResults: Anthropic.ToolResultBlockParam[] = []
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue
      console.log(`  → ${block.name}(${JSON.stringify(block.input).substring(0, 100)}...)`)
      const result = await dispatchTool(block.name, block.input as Record<string, unknown>)
      console.log(`    ${result.substring(0, 120).replace(/\n/g, ' ')}`)
      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
    }

    messages.push({ role: 'user', content: toolResults })
  }

  console.log('\n✅ Coding skill session complete')
}

main().catch(console.error)
