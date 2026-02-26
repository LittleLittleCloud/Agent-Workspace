'use client'

import { useState } from 'react'
import { api } from '@/lib/api'

interface Props {
  onClose: () => void
  onCreated: () => void
}

export function KeyCreateDialog({ onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [rawKey, setRawKey] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    try {
      const result = await api.createKey(name.trim())
      setRawKey(result.key)
    } catch {
      // TODO: toast
    } finally {
      setCreating(false)
    }
  }

  function handleDone() {
    onCreated()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
        {rawKey ? (
          /* Show the raw key — only displayed once */
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">API Key Created</h2>
            <p className="text-sm text-gray-500">
              Copy this key now. It will <strong>not</strong> be shown again.
            </p>
            <div className="rounded-md bg-gray-100 p-3 font-mono text-sm break-all dark:bg-gray-800">
              {rawKey}
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(rawKey)}
              className="text-sm text-brand-600 hover:underline"
            >
              Copy to clipboard
            </button>
            <div className="flex justify-end">
              <button
                onClick={handleDone}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Create form */
          <form onSubmit={handleCreate} className="space-y-4">
            <h2 className="text-lg font-semibold">Create API Key</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Key Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. CI/CD, local development"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
