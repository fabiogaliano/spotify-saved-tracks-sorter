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
import { Plus, Music, Zap, Moon, Coffee, Heart } from 'lucide-react'
import { PLAYLIST_AI_PREFIX, PLAYLIST_MAX_DESCRIPTION_LENGTH } from '~/lib/constants/playlist.constants'

interface CreateSmartPlaylistModalProps {
  onCreatePlaylist: (name: string, description: string) => void
  isCreating?: boolean
}

const PLAYLIST_TEMPLATES = [
  {
    icon: Coffee,
    name: 'main character energy',
    description: 'songs that make me feel like the main character in my own movie',
    color: 'text-amber-500'
  },
  {
    icon: Zap,
    name: 'gym villain era',
    description: 'aggressive bangers for when I need to absolutely demolish this workout',
    color: 'text-red-500'
  },
  {
    icon: Moon,
    name: 'chaotic study vibes',
    description: 'somehow helps me focus even though it makes no sense',
    color: 'text-blue-500'
  },
  {
    icon: Heart,
    name: 'serotonin hits',
    description: 'instant mood boost for when life is not vibing',
    color: 'text-pink-500'
  },
  {
    icon: Music,
    name: 'Custom',
    description: 'make it make sense bestie',
    color: 'text-purple-500'
  }
]

const CreateSmartPlaylistModal: React.FC<CreateSmartPlaylistModalProps> = ({
  onCreatePlaylist,
  isCreating = false
}) => {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null)

  const handleTemplateSelect = (template: typeof PLAYLIST_TEMPLATES[0], index: number) => {
    setSelectedTemplate(index)
    setDescription(template.description)
    if (template.name !== 'Custom') {
      setName(template.name)
    }
  }

  const resetForm = () => {
    setName('')
    setDescription('')
    setSelectedTemplate(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim() && description.trim()) {
      const finalDescription = `${PLAYLIST_AI_PREFIX}${description.trim()}`
      onCreatePlaylist(name.trim(), finalDescription)
      setOpen(false)
      resetForm()
    }
  }

  const isValidForm = name.trim().length > 0 && description.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen)
      if (newOpen) {
        resetForm() // Reset form when opening
      }
    }}>
      <DialogTrigger asChild>
        <Button
          className="bg-primary hover:bg-primary/90 text-primary-foreground border-0 transition-colors gap-2"
        >
          <Plus className="h-4 w-4" /> Create Smart Playlist
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Smart Playlist</DialogTitle>
          <DialogDescription>
            Choose a template or create a custom smart playlist.
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
                  ({description.length + 4}/300)
                </span>
              </Label>
              <div className="relative">
                <div className="flex gap-2">
                  <div className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary text-sm font-medium shrink-0">
                    {PLAYLIST_AI_PREFIX.slice(0, 1)}
                  </div>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => {
                      const value = e.target.value.slice(0, PLAYLIST_MAX_DESCRIPTION_LENGTH - PLAYLIST_AI_PREFIX.length)
                      setDescription(value)
                    }}
                    placeholder="Describe your playlist..."
                    maxLength={PLAYLIST_MAX_DESCRIPTION_LENGTH - PLAYLIST_AI_PREFIX.length}
                    rows={3}
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Your description will automatically start with "AI:" in Spotify
                </p>
              </div>
            </div>

            {/* Template Selection - Bottom */}
            <div className="space-y-3 pt-2 border-t border-border">
              <Label className="text-sm font-medium">Quick Templates</Label>
              <div className="grid grid-cols-2 gap-2">
                {PLAYLIST_TEMPLATES.map((template, index) => {
                  const Icon = template.icon
                  const isSelected = selectedTemplate === index
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleTemplateSelect(template, index)}
                      className={`p-3 rounded-lg border-2 text-left transition-all hover:scale-105 ${isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                        }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`h-4 w-4 ${template.color}`} />
                        <span className="font-medium text-sm">{template.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {template.description}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setOpen(false)
                resetForm()
              }}
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

export default CreateSmartPlaylistModal