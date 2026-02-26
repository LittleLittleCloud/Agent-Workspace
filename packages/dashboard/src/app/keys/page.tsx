'use client'

import { useEffect, useState } from 'react'
import { api, type ApiKeyInfo } from '@/lib/api'
import { KeyCreateDialog } from '@/components/key-create-dialog'

export default function KeysPage() {
  const [keys, setKeys] = useState<ApiKeyInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)

  useEffect(() => {
    loadKeys()
  }, [])

  async function loadKeys() {
    try {
      const result = await api.listKeys()
      setKeys(result)
    } catch {
      // TODO: toast
    } finally {
      setLoading(false)
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm('Revoke this API key? This cannot be undone.')) return
    try {
      await api.revokeKey(id)
      await loadKeys()
    } catch {
      // TODO: toast
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">API Keys</h1>
        <button
          onClick={() => setShowDialog(true)}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Create Key
        </button>
      </div>

      {showDialog && (
        <KeyCreateDialog
          onClose={() => setShowDialog(false)}
          onCreated={() => {
            setShowDialog(false)
            loadKeys()
          }}
        />
      )}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : keys.length === 0 ? (
        <p className="text-gray-500">No API keys yet. Create one to get started.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Prefix</th>
                <th className="px-4 py-3 font-medium">Scopes</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Last Used</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {keys.map((key) => (
                <tr key={key.id} className={key.revokedAt ? 'opacity-50' : ''}>
                  <td className="px-4 py-3 font-medium">{key.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{key.prefix}...</td>
                  <td className="px-4 py-3 text-xs">
                    {key.scopes.length > 0 ? key.scopes.join(', ') : 'all'}
                  </td>
                  <td className="px-4 py-3">{new Date(key.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {key.lastUsed ? new Date(key.lastUsed).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    {key.revokedAt ? (
                      <span className="text-xs text-red-500">Revoked</span>
                    ) : (
                      <button
                        onClick={() => handleRevoke(key.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
