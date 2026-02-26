const statusColors: Record<string, string> = {
  idle: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  starting: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  running: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  stopping: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

interface Props {
  status: string
}

export function VmStatusBadge({ status }: Props) {
  const colors = statusColors[status] ?? statusColors.idle

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors}`}>
      <span
        className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
          status === 'running'
            ? 'bg-green-500 animate-pulse'
            : status === 'error'
              ? 'bg-red-500'
              : 'bg-current opacity-40'
        }`}
      />
      {status}
    </span>
  )
}
