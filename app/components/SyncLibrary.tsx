import { Form } from '@remix-run/react'

type SyncLibraryProps = {
  userId: number | undefined
}

export function SyncLibrary({ userId }: SyncLibraryProps) {
  return (
    <div className="text-center">
      <Form method="post">
        <input type="hidden" name="userId" value={userId} />
        <button
          type="submit"
          name="_action"
          value="sync"
          className="px-6 py-3 bg-[#1DB954] text-white font-semibold rounded-full hover:bg-[#1ed760] transition-colors"
        >
          Sync Library
        </button>
      </Form>
    </div>
  )
} 