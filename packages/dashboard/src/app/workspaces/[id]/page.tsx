'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { api, type Workspace } from '@/lib/api'
import { VmStatusBadge } from '@/components/vm-status-badge'
import { FileBrowser } from '@/components/file-browser'
import { TerminalViewer } from '@/components/terminal-viewer'

export default function WorkspaceDetailPage() {
  const params = useParams<{ id: string }>()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'files' | 'terminal'>('files')

  useEffect(() => {
    loadWorkspace()
  }, [params.id])

  async function loadWorkspace() {
    try {
      const ws = await api.getWorkspace(params.id)
      setWorkspace(ws)
    } catch {
      // TODO: toast error
    } finally {
      setLoading(false)
    }
  }

  async function handleAttach() {
    if (!workspace) return
    await api.attachVm(workspace.id)
    await loadWorkspace()
  }

  async function handleDetach() {
    if (!workspace) return
    await api.detachVm(workspace.id)
    await loadWorkspace()
  }

  if (loading) return <p className="text-gray-500">Loading...</p>
  if (!workspace) return <p className="text-red-500">Workspace not found.</p>

  const isActive = workspace.status === 'running'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{workspace.name}</h1>
          <p className="mt-1 text-sm text-gray-500">ID: {workspace.id}</p>
        </div>
        <div className="flex items-center gap-3">
          <VmStatusBadge status={workspace.status} />
          {workspace.status === 'idle' && (
            <button
              onClick={handleAttach}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Attach VM
            </button>
          )}
          {isActive && (
            <button
              onClick={handleDetach}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Detach VM
            </button>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="grid gap-4 sm:grid-cols-3">
        <InfoCard label="Status" value={workspace.status} />
        <InfoCard label="VM ID" value={workspace.vmId ?? 'None'} />
        <InfoCard label="Created" value={new Date(workspace.createdAt).toLocaleDateString()} />
      </div>

      {/* Tabs — only when active */}
      {isActive && (
        <>
          <div className="border-b border-gray-200 dark:border-gray-800">
            <nav className="-mb-px flex gap-4">
              <TabButton active={activeTab === 'files'} onClick={() => setActiveTab('files')}>
                Files
              </TabButton>
              <TabButton active={activeTab === 'terminal'} onClick={() => setActiveTab('terminal')}>
                Terminal
              </TabButton>
            </nav>
          </div>

          {activeTab === 'files' ? (
            <FileBrowser workspaceId={workspace.id} />
          ) : (
            <TerminalViewer workspaceId={workspace.id} />
          )}
        </>
      )}
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs font-medium uppercase text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`border-b-2 px-3 py-2 text-sm font-medium transition ${
        active
          ? 'border-brand-600 text-brand-600'
          : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  )
}
