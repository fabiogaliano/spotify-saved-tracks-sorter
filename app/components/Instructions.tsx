export function Instructions() {
  return (
    <div className="bg-gray-50 rounded-2xl p-6 mb-8">
      <h2 className="text-lg font-semibold mb-4">How it works</h2>
      <ol className="space-y-3">
        <li>1. Create or select a playlist in Spotify</li>
        <li>2. Edit the playlist description to start with "AI:"</li>
        <li>3. Add your desired mood or theme after "AI:"</li>
      </ol>
      <div className="mt-4 p-4 bg-white rounded-xl">
        <p className="text-sm text-gray-600">Example description:</p>
        <p className="font-medium">AI: falling in love and taking life slowly</p>
      </div>
    </div>
  )
} 