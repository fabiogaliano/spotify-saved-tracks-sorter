type StatusFilterProps = {
  showStatus: 'all' | 'unsorted' | 'sorted' | 'ignored'
  onStatusChange: (status: 'all' | 'unsorted' | 'sorted' | 'ignored') => void
  showExtraStatus?: boolean
}

export function StatusFilter({ showStatus, onStatusChange, showExtraStatus = false }: StatusFilterProps) {
  const statusOptions = showExtraStatus 
    ? ['unsorted', 'sorted', 'all', 'ignored']
    : ['unsorted', 'all']

  const getSliderPosition = () => {
    if (!showExtraStatus) {
      return showStatus === 'unsorted' ? '2px' : 'calc(50% - 2px)'
    }
    
    switch (showStatus) {
      case 'unsorted':
        return '2px'
      case 'sorted':
        return 'calc(25% - 2px)'
      case 'all':
        return 'calc(50% - 2px)'
      case 'ignored':
        return 'calc(75% - 2px)'
      default:
        return '2px'
    }
  }

  const getSliderWidth = () => {
    return `calc(${showExtraStatus ? '25%' : '50%'} - 4px)`
  }

  return (
    <div className="inline-flex p-1.5 rounded-full bg-muted/80 shadow-xs">
      <div className="relative inline-flex bg-white/95 rounded-full">
        <div
          className="absolute transition-all duration-200 ease-out"
          style={{
            left: getSliderPosition(),
            width: getSliderWidth(),
            height: 'calc(100% - 4px)',
            transform: 'translateY(-50%)',
            top: '50%',
            background: 'linear-gradient(135deg, rgb(75, 85, 99) 0%, rgb(55, 65, 81) 100%)',
            borderRadius: '999px',
            boxShadow: `
              0px 2px 4px rgba(0, 0, 0, 0.1),
              0px 1px 2px rgba(0, 0, 0, 0.06),
              inset 0px 1px 1px rgba(255, 255, 255, 0.1)
            `,
            zIndex: 0,
          }}
        />
        {statusOptions.map((status) => (
          <button
            key={status}
            onClick={() => onStatusChange(status as any)}
            className={`relative px-6 py-1.5 text-sm font-medium transition-colors duration-200
              rounded-full z-10 min-w-[100px] select-none
              ${showStatus === status 
                ? 'text-foreground' 
                : 'text-muted-foreground/60 hover:text-gray-900'
              }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>
    </div>
  )
} 