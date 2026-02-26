'use client'

import { useRef, useState } from 'react'

interface Props {
  workspaceId: string
}

interface OutputLine {
  type: 'stdin' | 'stdout' | 'stderr'
  text: string
}

export function TerminalViewer({ workspaceId }: Props) {
  const [lines, setLines] = useState<OutputLine[]>([])
  const [input, setInput] = useState('')
  const [running, setRunning] = useState(false)
  const outputRef = useRef<HTMLDivElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cmd = input.trim()
    if (!cmd) return

    setLines((prev) => [...prev, { type: 'stdin', text: `$ ${cmd}` }])
    setInput('')
    setRunning(true)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787'
      const res = await fetch(`${apiUrl}/v1/workspaces/${workspaceId}/tools/bash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.stdout) {
          setLines((prev) => [...prev, { type: 'stdout', text: data.stdout }])
        }
        if (data.stderr) {
          setLines((prev) => [...prev, { type: 'stderr', text: data.stderr }])
        }
      } else {
        setLines((prev) => [...prev, { type: 'stderr', text: `Error: ${res.statusText}` }])
      }
    } catch (err) {
      setLines((prev) => [
        ...prev,
        { type: 'stderr', text: `Network error: ${String(err)}` },
      ])
    } finally {
      setRunning(false)
      // Scroll to bottom
      setTimeout(() => {
        outputRef.current?.scrollTo(0, outputRef.current.scrollHeight)
      }, 50)
    }
  }

  return (
    <div className="flex flex-col rounded-lg border border-gray-200 bg-gray-950 dark:border-gray-800">
      {/* Output area */}
      <div
        ref={outputRef}
        className="max-h-96 flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed"
      >
        {lines.length === 0 && (
          <p className="text-gray-600">Type a command below to execute in the workspace VM.</p>
        )}
        {lines.map((line, i) => (
          <div
            key={i}
            className={
              line.type === 'stdin'
                ? 'text-green-400'
                : line.type === 'stderr'
                  ? 'text-red-400'
                  : 'text-gray-200'
            }
          >
            <pre className="whitespace-pre-wrap">{line.text}</pre>
          </div>
        ))}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex border-t border-gray-800 bg-gray-900"
      >
        <span className="flex items-center px-3 text-green-400 font-mono text-sm">$</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={running}
          placeholder="Enter command..."
          className="flex-1 bg-transparent px-2 py-3 font-mono text-sm text-gray-100 outline-none placeholder:text-gray-600"
          autoFocus
        />
        <button
          type="submit"
          disabled={running}
          className="px-4 text-sm font-medium text-brand-500 hover:text-brand-400 disabled:opacity-50"
        >
          {running ? 'Running...' : 'Run'}
        </button>
      </form>
    </div>
  )
}
