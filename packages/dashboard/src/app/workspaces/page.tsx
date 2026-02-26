'use client'

import { useEffect, useState } from 'react'
import { api, type Workspace } from '@/lib/api'
import { WorkspaceTable } from '@/components/workspace-table'

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')

  useEffect(() => {
    loadWorkspaces()
  }, [])

  async function loadWorkspaces() {
    try {
      const result = await api.listWorkspaces()
      setWorkspaces(result.data)
    } catch {
      // TODO: toast error
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    try {
      await api.createWorkspace(newName.trim())
      setNewName('')
      await loadWorkspaces()
    } catch {
      // TODO: toast error
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this workspace? All data will be lost.')) return
    try {
      await api.deleteWorkspace(id)
      await loadWorkspaces()
    } catch {
      // TODO: toast error
    }
  }

  async function handleAttach(id: string) {
    try {
      await api.attachVm(id)
      await loadWorkspaces()
    } catch {
      // TODO: toast error
    }
  }

  async function handleDetach(id: string) {
    try {
      await api.detachVm(id)
      await loadWorkspaces()
    } catch {
      // TODO: toast error
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Workspaces</h1>
      </div>

      {/* Create form */}
      <form onSubmit={handleCreate} className="flex gap-3">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New workspace name..."
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        />
        <button
          type="submit"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Create
        </button>
      </form>

      {/* Table */}
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <WorkspaceTable
          workspaces={workspaces}
          onDelete={handleDelete}
          onAttach={handleAttach}
          onDetach={handleDetach}
        />
      )}
    </div>
  )
}
