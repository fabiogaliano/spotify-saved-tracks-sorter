import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Pencil, Sparkles } from 'lucide-react';
import { PlaylistImage } from '../ui';
import { Card } from '~/shared/components/ui/Card';
import { Button } from '~/shared/components/ui/button';
import { Switch } from '~/shared/components/ui/switch';
import { Textarea } from '~/shared/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '~/shared/components/ui/tooltip';
import { PlaylistUIFormat } from '../../types';
import { useClickOutside } from '../../hooks/useClickOutside';
import {
  extractUserDescription,
  getMaxCharacterLimit,
  getCurrentCharacterCount,
  isCharacterLimitExceeded
} from '../../utils/playlist-description';
import { FOCUS_DELAY, PLAYLIST_MAX_NAME_LENGTH, TEXTAREA_HEIGHT_BUFFER } from '~/lib/constants/playlist.constants';

interface PlaylistDetailsViewProps {
  hasAnalysis?: boolean;
  isAnalyzing?: boolean;
  currentPlaylist: PlaylistUIFormat;
  onToggleSmartSorting: (enabled: boolean) => void;
  onViewAnalysis?: () => void;
  onAnalyzePlaylist: () => void;
  onEditInfo: (name: string, description: string) => void;
}

// Constants


// Sub-component: Playlist Analysis Button
interface PlaylistAnalysisButtonProps {
  hasAnalysis?: boolean;
  isAnalyzing?: boolean;
  onAnalyzePlaylist: () => void;
  onViewAnalysis?: () => void;
}

const PlaylistAnalysisButton: React.FC<PlaylistAnalysisButtonProps> = ({
  hasAnalysis,
  isAnalyzing,
  onAnalyzePlaylist,
  onViewAnalysis,
}) => (
  <Button
    variant={hasAnalysis ? "secondary" : "default"}
    size="sm"
    className="h-8 ml-4"
    onClick={hasAnalysis && !isAnalyzing ? onViewAnalysis : onAnalyzePlaylist}
    disabled={isAnalyzing}
  >
    <Sparkles className={`h-3.5 w-3.5 mr-2 ${isAnalyzing ? 'animate-spin' : ''}`} />
    {isAnalyzing ? 'Analyzing...' : hasAnalysis ? 'View Analysis' : 'Analyze Playlist'}
  </Button>
);

// Sub-component: Playlist Metadata
interface PlaylistMetadataProps {
  name: string;
  nameDraft?: string;
  songCount: number;
  smartSortingEnabled: boolean;
  editMode?: boolean;
  inputRef?: React.RefObject<HTMLInputElement>;
  onToggleSmartSorting: (enabled: boolean) => void;
  onNameChange?: (name: string) => void;
}

const PlaylistMetadata: React.FC<PlaylistMetadataProps> = ({
  name,
  nameDraft,
  songCount,
  smartSortingEnabled,
  editMode = false,
  inputRef,
  onToggleSmartSorting,
  onNameChange
}) => (
  <div className="flex-1">
    <div className="flex items-center gap-3 mb-1">
      {editMode ? (
        <input
          ref={inputRef}
          type="text"
          value={nameDraft || name}
          onChange={(e) => onNameChange?.(e.target.value)}
          className="text-2xl font-semibold tracking-tight w-full bg-transparent border border-primary/50 rounded px-2 focus:ring-2 focus:ring-primary focus:outline-none"
        />
      ) : (
        <h2 className="text-2xl font-semibold tracking-tight">{name}</h2>
      )}
      {smartSortingEnabled && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 cursor-default" aria-label="Smart sorting enabled">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Smart sorting enabled
          </TooltipContent>
        </Tooltip>
      )}
    </div>
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span>{songCount} songs</span>
      <span>•</span>
      <label htmlFor="smart-sorting" className="cursor-pointer">
        Smart Sorting
      </label>
      <Switch
        id="smart-sorting"
        checked={smartSortingEnabled}
        onCheckedChange={onToggleSmartSorting}
        className="data-[state=checked]:bg-primary h-4 w-7"
        aria-label="Enable smart sorting"
      />
    </div>
  </div>
);

const PlaylistDetailsView: React.FC<PlaylistDetailsViewProps> = ({
  currentPlaylist,
  hasAnalysis,
  isAnalyzing = false,
  onToggleSmartSorting,
  onViewAnalysis,
  onAnalyzePlaylist,
  onEditInfo,
}) => {
  const [editMode, setEditMode] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const descriptionContainerRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const currentDescription = extractUserDescription(currentPlaylist.description);

  const isDescriptionTooLong = isCharacterLimitExceeded(
    currentPlaylist,
    editMode,
    descriptionDraft,
  );

  const isNameTooLong = (editMode ? nameDraft : currentPlaylist.name).length > PLAYLIST_MAX_NAME_LENGTH;

  const showEditButton = !editMode && currentPlaylist.description;

  const focusTextarea = useCallback(() => {
    setTimeout(() => textareaRef.current?.focus(), FOCUS_DELAY);
  }, []);

  const startEditing = useCallback(() => {
    setNameDraft(currentPlaylist.name);
    setDescriptionDraft(currentDescription);
    setEditMode(true);
    setHasUnsavedChanges(false);
    focusTextarea();
  }, [currentDescription, currentPlaylist.name, focusTextarea]);

  const cancelEditing = useCallback(() => {
    setEditMode(false);
    setNameDraft(currentPlaylist.name);
    setDescriptionDraft(currentDescription);
    setHasUnsavedChanges(false);
  }, [currentDescription, currentPlaylist.name]);

  const saveChanges = useCallback(() => {
    if (!isDescriptionTooLong && !isNameTooLong) {
      onEditInfo(nameDraft, descriptionDraft);
      setEditMode(false);
      setHasUnsavedChanges(false);
    }
  }, [nameDraft, descriptionDraft, isDescriptionTooLong, isNameTooLong, onEditInfo]);

  const discardChanges = useCallback(() => {
    setNameDraft(currentPlaylist.name);
    setDescriptionDraft(currentDescription);
    setHasUnsavedChanges(false);
  }, [currentDescription, currentPlaylist.name]);

  const resumeEditing = useCallback(() => {
    setEditMode(true);
    focusTextarea();
  }, [focusTextarea]);

  // Auto-resize textarea on mount and when description changes
  useEffect(() => {
    const resizeTextarea = () => {
      const textarea = textareaRef.current;
      if (textarea) {
        // Reset height to auto first to get accurate scrollHeight
        textarea.style.height = 'auto';
        // Set height to scrollHeight plus buffer
        const newHeight = textarea.scrollHeight + TEXTAREA_HEIGHT_BUFFER;
        textarea.style.height = newHeight + 'px';
      }
    };

    // Resize immediately
    resizeTextarea();

    // Also resize after a small delay to ensure DOM is fully rendered
    const timeoutId = setTimeout(resizeTextarea, 0);

    return () => clearTimeout(timeoutId);
  }, [currentPlaylist.description, editMode, descriptionDraft]);

  const handleClickOutside = useCallback(() => {
    const currentDescValue = extractUserDescription(currentPlaylist.description);
    const currentNameValue = currentPlaylist.name;
    if ((descriptionDraft !== currentDescValue && descriptionDraft !== '') ||
      (nameDraft !== currentNameValue && nameDraft !== '')) {
      setHasUnsavedChanges(true);
    } else {
      setEditMode(false);
      setHasUnsavedChanges(false);
    }
  }, [descriptionDraft, nameDraft, currentPlaylist.description, currentPlaylist.name]);

  useClickOutside([descriptionContainerRef, titleInputRef], handleClickOutside, editMode);

  // Handle browser navigation with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    if (hasUnsavedChanges) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [hasUnsavedChanges]);

  return (
    <TooltipProvider>
      <Card className="relative overflow-visible border-0 shadow-lg">
        {/* Background gradient that reaches edges */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-lg" />

        <div className="relative p-6 lg:p-8 pb-8">
          {/* Top Section - Playlist Info */}
          <div className="flex items-start gap-5">
            <PlaylistImage
              spotifyPlaylistId={currentPlaylist.spotifyId}
              playlistName={currentPlaylist.name}
              color={currentPlaylist.imageColor}
              size="lg"
            />
            <div className="flex-1 space-y-4">
              <div className="flex items-start justify-between">
                <PlaylistMetadata
                  name={currentPlaylist.name}
                  nameDraft={nameDraft}
                  songCount={currentPlaylist.songCount}
                  smartSortingEnabled={currentPlaylist.smartSortingEnabled}
                  editMode={editMode}
                  inputRef={titleInputRef}
                  onNameChange={setNameDraft}
                  onToggleSmartSorting={onToggleSmartSorting}
                />
                <PlaylistAnalysisButton
                  hasAnalysis={hasAnalysis}
                  isAnalyzing={isAnalyzing}
                  onAnalyzePlaylist={onAnalyzePlaylist}
                  onViewAnalysis={onViewAnalysis}
                />
              </div>

              {/* Playlist Description - moved here */}
              <div className="space-y-2 mb-4" ref={descriptionContainerRef}>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">
                    Playlist Description
                  </label>
                  {showEditButton && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={startEditing}
                    >
                      <Pencil className="h-3 w-3 mr-1.5" />
                      Edit
                    </Button>
                  )}
                </div>

                <div className="relative">
                  <Textarea
                    ref={textareaRef}
                    value={editMode ? descriptionDraft : extractUserDescription(currentPlaylist.description)}
                    onChange={(e) => {
                      const newValue = e.target.value;

                      // Allow typing but warn if over limit
                      setDescriptionDraft(newValue);
                      setHasUnsavedChanges(true);

                      // Resize on change
                      if (textareaRef.current) {
                        textareaRef.current.style.height = 'auto';
                        textareaRef.current.style.height = (textareaRef.current.scrollHeight + TEXTAREA_HEIGHT_BUFFER) + 'px';
                      }
                    }}
                    className={`w-full resize-none font-normal text-sm leading-relaxed overflow-hidden min-h-[80px] p-3 transition-[height] duration-100 ease-out ${editMode
                      ? 'ring-2 ring-primary border-primary'
                      : 'border-border hover:border-border/80 cursor-pointer'
                      }`}

                    style={{
                      // @ts-ignore
                      fieldSizing: 'content'
                    }}
                    placeholder={!currentPlaylist.description ? "Describe the mood, vibe, or theme for this playlist..." : ""}
                    readOnly={!editMode}
                    onClick={() => {
                      if (!editMode) {
                        startEditing();
                      }
                    }}
                  />

                  {/* Character counter */}
                  {editMode && (
                    <div className="flex items-center justify-between mt-1">
                      <div className="text-xs text-muted-foreground">
                        {currentPlaylist.smartSortingEnabled && (
                          <span className="text-primary">A smart ✨ prefix will be added automatically</span>
                        )}
                      </div>
                      <div className={`text-xs ${isDescriptionTooLong ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {getCurrentCharacterCount(currentPlaylist.description, editMode, descriptionDraft)}/{getMaxCharacterLimit(currentPlaylist.smartSortingEnabled)}
                      </div>
                    </div>
                  )}

                  {editMode && (
                    <div className="flex justify-end gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={cancelEditing}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        disabled={isDescriptionTooLong || isNameTooLong}
                        onClick={saveChanges}
                      >
                        Save
                      </Button>
                    </div>
                  )}

                  {/* Unsaved changes warning */}
                  {hasUnsavedChanges && !editMode && (
                    <div className="flex items-center justify-between mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-md">
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        You have unsaved changes
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs"
                          onClick={discardChanges}
                        >
                          Discard
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-6 text-xs"
                          onClick={resumeEditing}
                        >
                          Keep Editing
                        </Button>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </TooltipProvider>
  );
};

export default PlaylistDetailsView;