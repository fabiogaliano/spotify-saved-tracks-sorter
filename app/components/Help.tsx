export function Help() {
  return (
    <div className="bg-muted rounded-2xl p-6 mb-8">
      <h2 className="text-lg font-semibold mb-4">How it works</h2>
      
      <h3 className="font-medium mb-2">Setting up playlists</h3>
      <ol className="space-y-3 mb-6">
        <li>1. Create or select a playlist in Spotify</li>
        <li>2. Edit the playlist description to start with "AI:"</li>
        <li>3. Add your desired mood or theme after "AI:"</li>
      </ol>
      
      <div className="mt-4 p-4 bg-white rounded-xl mb-6">
        <p className="text-sm text-muted-foreground/60">Example description:</p>
        <p className="font-medium">AI: falling in love and taking life slowly</p>
      </div>

      <h3 className="font-medium mb-2">Track Controls</h3>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
            {/* Playlist icon */}
            <svg className="w-3 h-3 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-sm">
            <span className="font-medium">Sort:</span> Enable the track to be sorted into matching AI playlists
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-white border border-border flex items-center justify-center">
            {/* Skip/Pause icon */}
            <svg className="w-3 h-3 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14m8-14v14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-sm">
            <span className="font-medium">Skip:</span> Temporarily ignore the track - it will reappear in future sorting sessions
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-rose-50 border-2 border-rose-200 flex items-center justify-center">
            {/* Remove/Block icon */}
            <svg className="w-3 h-3 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-sm">
            <span className="font-medium">Remove:</span> Remove the track from sorting consideration permanently
          </p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground/60 mt-4">
        Tip: You can click or drag the control button to change a track's status
      </p>
    </div>
  )
} 