/**
 * Header Component
 *
 * Bloomberg-style header with ASCII art title and track count.
 */

import { BLOOMBERG } from '../theme'

// Pre-rendered ASCII art for "COST FORECAST" - using block style
const ASCII_TITLE = [
	'░█▀▀░█▀█░█▀▀░▀█▀░░░░░█▀▀░█▀█░█▀▄░█▀▀░█▀▀░█▀█░█▀▀░▀█▀',
	'░█░░░█░█░▀▀█░░█░░░░░░█▀░░█░█░█▀▄░█▀▀░█░░░█▀█░▀▀█░░█░',
	'░▀▀▀░▀▀▀░▀▀▀░░▀░░░░░░▀░░░▀▀▀░▀░▀░▀▀▀░▀▀▀░▀░▀░▀▀▀░░▀░',
]

interface HeaderProps {
	trackCount: number
	analyzedCount: number
}

export function Header({ trackCount, analyzedCount }: HeaderProps) {
	return (
		<box
			flexDirection="column"
			borderColor={BLOOMBERG.amber}
			borderStyle="double"
			border
			paddingLeft={2}
			paddingRight={2}
		>
			{/* ASCII Art Title Row */}
			<box flexDirection="row" justifyContent="space-between" alignItems="flex-start">
				{/* ASCII Title */}
				<box flexDirection="column">
					{ASCII_TITLE.map((line, i) => (
						<text key={i} fg={BLOOMBERG.amber}>
							{line}
						</text>
					))}
				</box>

				{/* Title + Info */}
				<box flexDirection="column" alignItems="flex-end" paddingTop={1}>
					<text fg={BLOOMBERG.amberBright}>
						<strong>ESTIMATION TERMINAL</strong>
					</text>
					<box flexDirection="row" gap={2}>
						<text fg={BLOOMBERG.text}>{analyzedCount.toLocaleString()} analyzed</text>
						<text fg={BLOOMBERG.textDim}>│</text>
						<text fg={BLOOMBERG.textDim}>{trackCount.toLocaleString()} tracks</text>
					</box>
				</box>
			</box>
		</box>
	)
}
