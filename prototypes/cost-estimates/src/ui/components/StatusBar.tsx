/**
 * StatusBar Component
 *
 * Bottom status bar with current status, keyboard shortcuts, and progress.
 */

import { BLOOMBERG } from '../theme'

interface StatusBarProps {
	statusLabel: string
	statusValue?: string
	statusColor?: string
	progress?: {
		current: number
		total: number
		detail?: string
	}
}

export function StatusBar({ statusLabel, statusValue, statusColor, progress }: StatusBarProps) {
	return (
		<box
			flexDirection="row"
			borderColor={BLOOMBERG.borderDim}
			borderStyle="single"
			border
			paddingLeft={1}
			paddingRight={1}
			justifyContent="space-between"
		>
			{/* Left: Status or Progress */}
			<box flexDirection="row" gap={1} flexShrink={1}>
				{progress ? (
					<ProgressIndicator {...progress} />
				) : (
					<box flexDirection="row">
						<text fg={statusColor || BLOOMBERG.amber}>{statusLabel}</text>
						{statusValue && (
							<text fg={BLOOMBERG.textDim}> {statusValue}</text>
						)}
					</box>
				)}
			</box>

			{/* Right: Keyboard shortcuts */}
			<box flexDirection="row" gap={1}>
				<ShortcutHint keys="Tab" action="section" />
				<text fg={BLOOMBERG.borderDim}>│</text>
				<ShortcutHint keys="jk" action="select" />
				<text fg={BLOOMBERG.borderDim}>│</text>
				<ShortcutHint keys="⏎" action="run" />
				<text fg={BLOOMBERG.borderDim}>│</text>
				<ShortcutHint keys="q" action="quit" />
			</box>
		</box>
	)
}

function ProgressIndicator({ current, total, detail }: { current: number; total: number; detail?: string }) {
	const pct = Math.round((current / total) * 100)
	const filled = Math.floor((pct / 100) * 20)
	const bar = '█'.repeat(filled) + '░'.repeat(20 - filled)

	return (
		<box flexDirection="row" gap={1}>
			<text fg={BLOOMBERG.amber}>[{bar}]</text>
			<text fg={BLOOMBERG.text}>{pct}%</text>
			<text fg={BLOOMBERG.borderDim}>│</text>
			<text fg={BLOOMBERG.textDim}>
				{current}/{total}
			</text>
			{detail && <text fg={BLOOMBERG.textMuted}>│ {detail.slice(0, 40)}</text>}
		</box>
	)
}

function ShortcutHint({ keys, action }: { keys: string; action: string }) {
	return (
		<box flexDirection="row">
			<text fg={BLOOMBERG.amber}>{keys}</text>
			<text fg={BLOOMBERG.textDim}> {action}</text>
		</box>
	)
}
