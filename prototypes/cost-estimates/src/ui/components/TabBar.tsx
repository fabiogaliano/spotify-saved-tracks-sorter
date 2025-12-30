/**
 * TabBar Component
 *
 * Horizontal tab navigation for switching between estimation types.
 */

import { BLOOMBERG } from '../theme'

export type TabType = 'vectorization' | 'llm'

interface TabBarProps {
	activeTab: TabType
	onTabChange: (tab: TabType) => void
}

const TABS: { id: TabType; label: string }[] = [
	{ id: 'vectorization', label: 'VECTORIZATION' },
	{ id: 'llm', label: 'LLM ANALYSIS' },
]

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
	return (
		<box
			flexDirection="row"
			borderColor={BLOOMBERG.borderDim}
			borderStyle="single"
			border
			paddingLeft={1}
			paddingRight={1}
			gap={1}
		>
			{TABS.map((tab, index) => {
				const isActive = activeTab === tab.id
				return (
					<box key={tab.id} flexDirection="row">
						{/* Tab indicator */}
						<text fg={isActive ? BLOOMBERG.amber : BLOOMBERG.textMuted}>
							{isActive ? '▸ ' : '  '}
						</text>

						{/* Tab content */}
						<box
							paddingLeft={1}
							paddingRight={1}
							backgroundColor={isActive ? BLOOMBERG.highlightBg : undefined}
						>
							<text fg={isActive ? BLOOMBERG.amberBright : BLOOMBERG.textDim}>
								{isActive ? <strong>[{index + 1}] {tab.label}</strong> : `[${index + 1}] ${tab.label}`}
							</text>
						</box>

						{/* Separator */}
						{index < TABS.length - 1 && (
							<text fg={BLOOMBERG.borderDim}> │ </text>
						)}
					</box>
				)
			})}

			{/* Keyboard hint */}
			<box flexGrow={1} />
			<box flexDirection="row">
				<text fg={BLOOMBERG.amber}>←→</text>
				<text fg={BLOOMBERG.textMuted}> switch tabs</text>
			</box>
		</box>
	)
}
