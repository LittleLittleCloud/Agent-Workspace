'use client'

import { useEffect, useState } from 'react'

interface FileEntry {
  path: string
  type: 'file' | 'dir' | 'symlink'
  size: number
}

interface Props {
  workspaceId: string
}

export function FileBrowser({ workspaceId }: Props) {
  const [cwd, setCwd] = useState('/')
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)

  useEffect(() => {
    loadFiles()
  }, [cwd])

  async function loadFiles() {
    setLoading(true)
    setContent(null)
    setSelectedFile(null)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787'
      const res = await fetch(`${apiUrl}/v1/workspaces/${workspaceId}/files?path=${encodeURIComponent(cwd)}`)
      if (res.ok) {
        const data = await res.json()
        setEntries(data.entries ?? [])
      }
    } catch {
      // TODO: toast
    } finally {
      setLoading(false)
    }
  }

  async function openFile(path: string) {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787'
      const res = await fetch(`${apiUrl}/v1/workspaces/${workspaceId}/files/read?path=${encodeURIComponent(path)}`)
      if (res.ok) {
        const data = await res.json()
        setContent(data.content ?? '')
        setSelectedFile(path)
      }
    } catch {
      // TODO: toast
    }
  }

  function navigateUp() {
    const parts = cwd.split('/').filter(Boolean)
    parts.pop()
    setCwd('/' + parts.join('/'))
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* File list */}
      <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2 dark:border-gray-800">
          <span className="font-mono text-xs text-gray-500">{cwd}</span>
          {cwd !== '/' && (
            <button
              onClick={navigateUp}
              className="text-xs text-brand-600 hover:underline"
            >
              ← Up
            </button>
          )}
        </div>

        {loading ? (
          <p className="p-4 text-sm text-gray-500">Loading...</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {entries.map((entry) => (
              <li key={entry.path}>
                <button
                  onClick={() => {
                    if (entry.type === 'dir') {
                      setCwd(entry.path)
                    } else {
                      openFile(entry.path)
                    }
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <span className="text-gray-400">
                    {entry.type === 'dir' ? '📁' : '📄'}
                  </span>
                  <span className="flex-1 truncate">{entry.path.split('/').pop()}</span>
                  {entry.type === 'file' && (
                    <span className="text-xs text-gray-400">
                      {formatSize(entry.size)}
                    </span>
                  )}
                </button>
              </li>
            ))}
            {entries.length === 0 && (
              <li className="px-4 py-3 text-sm text-gray-500">Empty directory</li>
            )}
          </ul>
        )}
      </div>

      {/* File viewer */}
      <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 px-4 py-2 dark:border-gray-800">
          <span className="font-mono text-xs text-gray-500">
            {selectedFile ?? 'Select a file to view'}
          </span>
        </div>
        <pre className="max-h-96 overflow-auto p-4 text-xs leading-relaxed">
          {content ?? ''}
        </pre>
      </div>
    </div>
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
