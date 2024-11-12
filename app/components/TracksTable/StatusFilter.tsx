type StatusFilterProps = {
  showStatus: 'all' | 'unsorted' | 'sorted' | 'ignored'
  onStatusChange: (status: 'all' | 'unsorted' | 'sorted' | 'ignored') => void
}

export function StatusFilter({ showStatus, onStatusChange }: StatusFilterProps) {
  return (
    <div className="flex space-x-2 mb-6">
      <button
        onClick={() => onStatusChange('all')}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          showStatus === 'all'
            ? 'bg-gray-900 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        All Tracks
      </button>
      <button
        onClick={() => onStatusChange('unsorted')}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          showStatus === 'unsorted'
            ? 'bg-gray-900 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        Unsorted
      </button>
    </div>
  )
} 