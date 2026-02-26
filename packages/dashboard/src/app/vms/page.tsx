'use client'

import { useEffect, useState } from 'react'
import { VmStatusBadge } from '@/components/vm-status-badge'
import { api, type Workspace } from '@/lib/api'

export default function VmsPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const result = await api.listWorkspaces(1, 100)
      // Show only workspaces that have (or recently had) a VM attached
      setWorkspaces(result.data.filter((w) => w.vmId || w.status !== 'idle'))
    } catch {
      // TODO: toast
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">VMs</h1>
      <p className="text-sm text-gray-500">
        VMs are ephemeral Fly Machines attached to workspaces. Manage them from
        the workspace detail page.
      </p>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : workspaces.length === 0 ? (
        <p className="text-gray-500">No active VMs.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 font-medium">Workspace</th>
                <th className="px-4 py-3 font-medium">VM ID</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {workspaces.map((ws) => (
                <tr key={ws.id}>
                  <td className="px-4 py-3 font-medium">{ws.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{ws.vmId ?? '—'}</td>
                  <td className="px-4 py-3">
                    <VmStatusBadge status={ws.status} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{ws.vmIp ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
