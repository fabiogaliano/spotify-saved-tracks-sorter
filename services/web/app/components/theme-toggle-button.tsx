import { useEffect, useState } from 'react'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

import { Button } from '~/shared/components/ui/button'

export function ThemeToggleButton() {
	const { theme, setTheme, resolvedTheme } = useTheme()
	const [mounted, setMounted] = useState(false)

	// useEffect only runs on the client, so we can safely show the UI
	useEffect(() => {
		setMounted(true)
	}, [])

	if (!mounted) {
		// return a placeholder or null to avoid hydration mismatch
		return (
			<Button variant="outline" size="icon" disabled className="h-9 w-9">
				&nbsp;
			</Button>
		)
	}

	const currentTheme = theme === 'system' ? resolvedTheme : theme

	const toggleTheme = () => {
		setTheme(currentTheme === 'dark' ? 'light' : 'dark')
	}

	return (
		<Button
			variant="outline"
			size="icon"
			onClick={toggleTheme}
			aria-label={
				currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
			}
			className="bg-background border-border hover:bg-muted h-9 w-9 transition-colors"
		>
			{currentTheme === 'dark' ?
				<Sun className="text-foreground h-[1.2rem] w-[1.2rem]" />
			:	<Moon className="text-foreground h-[1.2rem] w-[1.2rem]" />}
		</Button>
	)
}
