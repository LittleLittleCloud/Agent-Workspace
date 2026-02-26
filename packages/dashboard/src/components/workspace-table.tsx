'use client'

import Link from 'next/link'
import type { Workspace } from '@/lib/api'
import { VmStatusBadge } from './vm-status-badge'

interface Props {
  workspaces: Workspace[]
  onDelete: (id: string) => void
  onAttach: (id: string) => void
  onDetach: (id: string) => void
}

export function WorkspaceTable({ workspaces, onDelete, onAttach, onDetach }: Props) {
  if (workspaces.length === 0) {
    return (
      <p className="text-gray-500">
        No workspaces yet. Create one above to get started.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">VM</th>
            <th className="px-4 py-3 font-medium">Created</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
          {workspaces.map((ws) => (
            <tr key={ws.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
              <td className="px-4 py-3">
                <Link
                  href={`/workspaces/${ws.id}`}
                  className="font-medium text-brand-600 hover:underline"
                >
                  {ws.name}
                </Link>
              </td>
              <td className="px-4 py-3">
                <VmStatusBadge status={ws.status} />
              </td>
              <td className="px-4 py-3 font-mono text-xs">
                {ws.vmId ?? '—'}
              </td>
              <td className="px-4 py-3">
                {new Date(ws.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  {ws.status === 'idle' && (
                    <button
                      onClick={() => onAttach(ws.id)}
                      className="text-xs text-green-600 hover:underline"
                    >
                      Attach
                    </button>
                  )}
                  {ws.status === 'running' && (
                    <button
                      onClick={() => onDetach(ws.id)}
                      className="text-xs text-yellow-600 hover:underline"
                    >
                      Detach
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(ws.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
