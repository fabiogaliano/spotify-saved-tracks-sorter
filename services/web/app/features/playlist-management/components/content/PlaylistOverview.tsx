import React, { useCallback, useEffect, useRef, useState } from 'react'

import { Pencil, Sparkles } from 'lucide-react'

import {
	FOCUS_DELAY,
	PLAYLIST_MAX_NAME_LENGTH,
	TEXTAREA_HEIGHT_BUFFER,
} from '~/lib/constants/playlist.constants'
import { Card } from '~/shared/components/ui/Card'
import { Button } from '~/shared/components/ui/button'
import { Switch } from '~/shared/components/ui/switch'
import { Textarea } from '~/shared/components/ui/textarea'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '~/shared/components/ui/tooltip'

import { useClickOutside } from '../../hooks/useClickOutside'
import { PlaylistUIFormat } from '../../types'
import {
	extractUserDescription,
	getCurrentCharacterCount,
	getMaxCharacterLimit,
	isCharacterLimitExceeded,
} from '../../utils/playlist-description'
import { PlaylistImage } from '../ui'

interface PlaylistDetailsViewProps {
	hasAnalysis?: boolean
	isAnalyzing?: boolean
	currentPlaylist: PlaylistUIFormat
	onToggleSmartSorting: (enabled: boolean) => void
	onViewAnalysis?: () => void
	onAnalyzePlaylist: () => void
	onEditInfo: (name: string, description: string) => void
}

// Constants

// Sub-component: Playlist Analysis Button
interface PlaylistAnalysisButtonProps {
	hasAnalysis?: boolean
	isAnalyzing?: boolean
	onAnalyzePlaylist: () => void
	onViewAnalysis?: () => void
}

const PlaylistAnalysisButton: React.FC<PlaylistAnalysisButtonProps> = ({
	hasAnalysis,
	isAnalyzing,
	onAnalyzePlaylist,
	onViewAnalysis,
}) => (
	<Button
		variant={hasAnalysis ? 'secondary' : 'default'}
		size="sm"
		className="ml-4 h-8"
		onClick={hasAnalysis && !isAnalyzing ? onViewAnalysis : onAnalyzePlaylist}
		disabled={isAnalyzing}
	>
		<Sparkles className={`mr-2 h-3.5 w-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
		{isAnalyzing ?
			'Analyzing...'
		: hasAnalysis ?
			'View Analysis'
		:	'Analyze Playlist'}
	</Button>
)

// Sub-component: Playlist Metadata
interface PlaylistMetadataProps {
	name: string
	nameDraft?: string
	songCount: number
	smartSortingEnabled: boolean
	editMode?: boolean
	inputRef?: React.RefObject<HTMLInputElement>
	onToggleSmartSorting: (enabled: boolean) => void
	onNameChange?: (name: string) => void
}

const PlaylistMetadata: React.FC<PlaylistMetadataProps> = ({
	name,
	nameDraft,
	songCount,
	smartSortingEnabled,
	editMode = false,
	inputRef,
	onToggleSmartSorting,
	onNameChange,
}) => (
	<div className="flex-1">
		<div className="mb-1 flex items-center gap-3">
			{editMode ?
				<input
					ref={inputRef}
					type="text"
					value={nameDraft || name}
					onChange={e => onNameChange?.(e.target.value)}
					className="border-primary/50 focus:ring-primary w-full rounded border bg-transparent px-2 text-2xl font-semibold tracking-tight focus:ring-2 focus:outline-none"
				/>
			:	<h2 className="text-2xl font-semibold tracking-tight">{name}</h2>}
			{smartSortingEnabled && (
				<Tooltip>
					<TooltipTrigger asChild>
						<div
							className="bg-primary/10 inline-flex h-6 w-6 cursor-default items-center justify-center rounded-full"
							aria-label="Smart sorting enabled"
						>
							<Sparkles className="text-primary h-3.5 w-3.5" />
						</div>
					</TooltipTrigger>
					<TooltipContent side="top" className="text-xs">
						Smart sorting enabled
					</TooltipContent>
				</Tooltip>
			)}
		</div>
		<div className="text-muted-foreground flex items-center gap-2 text-sm">
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
)

const PlaylistDetailsView: React.FC<PlaylistDetailsViewProps> = ({
	currentPlaylist,
	hasAnalysis,
	isAnalyzing = false,
	onToggleSmartSorting,
	onViewAnalysis,
	onAnalyzePlaylist,
	onEditInfo,
}) => {
	const [editMode, setEditMode] = useState(false)
	const [nameDraft, setNameDraft] = useState('')
	const [descriptionDraft, setDescriptionDraft] = useState('')
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const descriptionContainerRef = useRef<HTMLDivElement>(null)
	const titleInputRef = useRef<HTMLInputElement>(null)

	const currentDescription = extractUserDescription(currentPlaylist.description)

	const isDescriptionTooLong = isCharacterLimitExceeded(
		currentPlaylist,
		editMode,
		descriptionDraft
	)

	const isNameTooLong =
		(editMode ? nameDraft : currentPlaylist.name).length > PLAYLIST_MAX_NAME_LENGTH

	const showEditButton = !editMode && currentPlaylist.description

	const focusTextarea = useCallback(() => {
		setTimeout(() => textareaRef.current?.focus(), FOCUS_DELAY)
	}, [])

	const startEditing = useCallback(() => {
		setNameDraft(currentPlaylist.name)
		setDescriptionDraft(currentDescription)
		setEditMode(true)
		setHasUnsavedChanges(false)
		focusTextarea()
	}, [currentDescription, currentPlaylist.name, focusTextarea])

	const cancelEditing = useCallback(() => {
		setEditMode(false)
		setNameDraft(currentPlaylist.name)
		setDescriptionDraft(currentDescription)
		setHasUnsavedChanges(false)
	}, [currentDescription, currentPlaylist.name])

	const saveChanges = useCallback(() => {
		if (!isDescriptionTooLong && !isNameTooLong) {
			onEditInfo(nameDraft, descriptionDraft)
			setEditMode(false)
			setHasUnsavedChanges(false)
		}
	}, [nameDraft, descriptionDraft, isDescriptionTooLong, isNameTooLong, onEditInfo])

	const discardChanges = useCallback(() => {
		setNameDraft(currentPlaylist.name)
		setDescriptionDraft(currentDescription)
		setHasUnsavedChanges(false)
	}, [currentDescription, currentPlaylist.name])

	const resumeEditing = useCallback(() => {
		setEditMode(true)
		focusTextarea()
	}, [focusTextarea])

	// Auto-resize textarea on mount and when description changes
	useEffect(() => {
		const resizeTextarea = () => {
			const textarea = textareaRef.current
			if (textarea) {
				// Reset height to auto first to get accurate scrollHeight
				textarea.style.height = 'auto'
				// Set height to scrollHeight plus buffer
				const newHeight = textarea.scrollHeight + TEXTAREA_HEIGHT_BUFFER
				textarea.style.height = newHeight + 'px'
			}
		}

		// Resize immediately
		resizeTextarea()

		// Also resize after a small delay to ensure DOM is fully rendered
		const timeoutId = setTimeout(resizeTextarea, 0)

		return () => clearTimeout(timeoutId)
	}, [currentPlaylist.description, editMode, descriptionDraft])

	const handleClickOutside = useCallback(() => {
		const currentDescValue = extractUserDescription(currentPlaylist.description)
		const currentNameValue = currentPlaylist.name
		if (
			(descriptionDraft !== currentDescValue && descriptionDraft !== '') ||
			(nameDraft !== currentNameValue && nameDraft !== '')
		) {
			setHasUnsavedChanges(true)
		} else {
			setEditMode(false)
			setHasUnsavedChanges(false)
		}
	}, [descriptionDraft, nameDraft, currentPlaylist.description, currentPlaylist.name])

	useClickOutside([descriptionContainerRef, titleInputRef], handleClickOutside, editMode)

	// Handle browser navigation with unsaved changes
	useEffect(() => {
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			if (hasUnsavedChanges) {
				e.preventDefault()
				e.returnValue = ''
			}
		}

		if (hasUnsavedChanges) {
			window.addEventListener('beforeunload', handleBeforeUnload)
			return () => window.removeEventListener('beforeunload', handleBeforeUnload)
		}
	}, [hasUnsavedChanges])

	return (
		<TooltipProvider>
			<Card className="relative overflow-visible border-0 shadow-lg">
				{/* Background gradient that reaches edges */}
				<div className="from-primary/5 absolute inset-0 rounded-lg bg-gradient-to-br to-transparent" />

				<div className="relative p-6 pb-8 lg:p-8">
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
							<div className="mb-4 space-y-2" ref={descriptionContainerRef}>
								<div className="flex items-center justify-between">
									<label className="text-foreground text-sm font-medium">
										Playlist Description
									</label>
									{showEditButton && (
										<Button
											variant="ghost"
											size="sm"
											className="h-7 text-xs"
											onClick={startEditing}
										>
											<Pencil className="mr-1.5 h-3 w-3" />
											Edit
										</Button>
									)}
								</div>

								<div className="relative">
									<Textarea
										ref={textareaRef}
										value={
											editMode ? descriptionDraft : (
												extractUserDescription(currentPlaylist.description)
											)
										}
										onChange={e => {
											const newValue = e.target.value

											// Allow typing but warn if over limit
											setDescriptionDraft(newValue)
											setHasUnsavedChanges(true)

											// Resize on change
											if (textareaRef.current) {
												textareaRef.current.style.height = 'auto'
												textareaRef.current.style.height =
													textareaRef.current.scrollHeight + TEXTAREA_HEIGHT_BUFFER + 'px'
											}
										}}
										className={`min-h-[80px] w-full resize-none overflow-hidden p-3 text-sm leading-relaxed font-normal transition-[height] duration-100 ease-out ${
											editMode ?
												'ring-primary border-primary ring-2'
											:	'border-border hover:border-border/80 cursor-pointer'
										}`}
										style={{
											// @ts-ignore
											fieldSizing: 'content',
										}}
										placeholder={
											!currentPlaylist.description ?
												'Describe the mood, vibe, or theme for this playlist...'
											:	''
										}
										readOnly={!editMode}
										onClick={() => {
											if (!editMode) {
												startEditing()
											}
										}}
									/>

									{/* Character counter */}
									{editMode && (
										<div className="mt-1 flex items-center justify-between">
											<div className="text-muted-foreground text-xs">
												{currentPlaylist.smartSortingEnabled && (
													<span className="text-primary">
														A smart ✨ prefix will be added automatically
													</span>
												)}
											</div>
											<div
												className={`text-xs ${isDescriptionTooLong ? 'text-red-500' : 'text-muted-foreground'}`}
											>
												{getCurrentCharacterCount(
													currentPlaylist.description,
													editMode,
													descriptionDraft
												)}
												/{getMaxCharacterLimit(currentPlaylist.smartSortingEnabled)}
											</div>
										</div>
									)}

									{editMode && (
										<div className="mt-2 flex justify-end gap-2">
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
										<div className="mt-2 flex items-center justify-between rounded-md border border-amber-500/20 bg-amber-500/10 p-2">
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
	)
}

export default PlaylistDetailsView
