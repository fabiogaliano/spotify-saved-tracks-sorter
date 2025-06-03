import React, { useState } from 'react'
import { Button } from '~/shared/components/ui/button'
import { Input } from '~/shared/components/ui/input'
import { Label } from '~/shared/components/ui/label'
import { Textarea } from '~/shared/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/shared/components/ui/dialog'
import { Plus } from 'lucide-react'

interface CreateAIPlaylistModalProps {
  onCreatePlaylist: (name: string, description: string) => void
  isCreating?: boolean
}

const CreateAIPlaylistModal: React.FC<CreateAIPlaylistModalProps> = ({
  onCreatePlaylist,
  isCreating = false
}) => {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('AI:')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim() && description.trim()) {
      onCreatePlaylist(name.trim(), description.trim())
      setOpen(false)
      setName('')
      setDescription('AI:')
    }
  }

  const isValidForm = name.trim().length > 0 && 
                     description.trim().length > 3 && 
                     description.startsWith('AI:')

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="bg-primary hover:bg-primary/90 text-primary-foreground border-0 transition-colors gap-2"
        >
          <Plus className="h-4 w-4" /> Create AI Playlist
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create AI Playlist</DialogTitle>
          <DialogDescription>
            Create a new playlist that will be managed by AI. The description must start with "AI:".
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                Playlist Name
                <span className="text-muted-foreground text-sm ml-2">
                  ({name.length}/100)
                </span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 100))}
                placeholder="Enter playlist name"
                maxLength={100}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">
                Description
                <span className="text-muted-foreground text-sm ml-2">
                  ({description.length}/300)
                </span>
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => {
                  const value = e.target.value.slice(0, 300)
                  if (value.startsWith('AI:') || value === '') {
                    setDescription(value === '' ? 'AI:' : value)
                  }
                }}
                placeholder="AI: Describe your playlist..."
                maxLength={300}
                rows={3}
              />
              {!description.startsWith('AI:') && description.length > 0 && (
                <p className="text-destructive text-sm">
                  Description must start with "AI:"
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => setOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!isValidForm || isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Playlist'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default CreateAIPlaylistModal