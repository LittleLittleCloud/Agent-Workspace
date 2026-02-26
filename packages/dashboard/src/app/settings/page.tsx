'use client'

import { useState } from 'react'

export default function SettingsPage() {
  const [orgName, setOrgName] = useState('My Organization')

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Org Details */}
      <section className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-semibold">Organization</h2>
        <div className="mt-4 max-w-md space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Name
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
          </div>
          <button className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            Save
          </button>
        </div>
      </section>

      {/* Members */}
      <section className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-semibold">Members</h2>
        <p className="mt-2 text-sm text-gray-500">
          Invite team members to collaborate. Members share access to all workspaces and API keys in
          this organization.
        </p>
        <div className="mt-4">
          <div className="flex gap-3">
            <input
              type="email"
              placeholder="Email address"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            />
            <select className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800">
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
              Invite
            </button>
          </div>
        </div>

        <div className="mt-6 text-sm text-gray-500">No members yet.</div>
      </section>

      {/* Danger Zone */}
      <section className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950">
        <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">Danger Zone</h2>
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          Deleting the organization will permanently remove all workspaces, API keys, and data.
        </p>
        <button className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
          Delete Organization
        </button>
      </section>
    </div>
  )
}
