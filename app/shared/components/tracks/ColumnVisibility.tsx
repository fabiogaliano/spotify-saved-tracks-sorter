import { useState } from 'react'
import { Help } from '~/components/Instructions'

type ColumnToggleProps = {
  showAlbum: boolean
  showAddedDate: boolean
  onShowAlbumChange: (show: boolean) => void
  onShowAddedDateChange: (show: boolean) => void
}


export function ColumnToggle({
  showAlbum,
  showAddedDate,
  onShowAlbumChange,
  onShowAddedDateChange,
}: ColumnToggleProps) {
  return (
    <div className="flex items-center space-x-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => onShowAlbumChange(!showAlbum)}
          className={`text-sm transition-colors ${
            showAlbum 
              ? 'text-gray-900 font-medium' 
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          {showAlbum ? 'Album' : <s>Album</s>}
        </button>
        <button
          onClick={() => onShowAddedDateChange(!showAddedDate)}
          className={`text-sm transition-colors ${
            showAddedDate 
              ? 'text-gray-900 font-medium' 
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          {showAddedDate ? 'Added Date' : <s>Added Date</s>}
        </button>
      </div>
    </div>
  )
} 