#!/usr/bin/env bun
/**
 * Cost Estimation Tool
 *
 * Bloomberg terminal-style TUI for estimating vectorization and LLM costs.
 * Uses real data from Supabase and actual web services.
 *
 * Usage:
 *   bun run src/index.tsx                     # Interactive TUI mode
 *   bun run src/index.tsx --help              # Show help
 */

import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as loadEnv } from 'dotenv'

// Load environment from parent project FIRST - before any other imports
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../../../services/web/.env')
loadEnv({ path: envPath })

import { createCliRenderer } from '@opentui/core'
import { createRoot } from '@opentui/react'
import { App } from './ui/App'
import { BLOOMBERG } from './ui/theme'

// =============================================================================
// CLI
// =============================================================================

function parseArgs() {
	const args = { help: false }
	const argv = process.argv.slice(2)

	for (const arg of argv) {
		if (arg === '--help' || arg === '-h') args.help = true
	}

	return args
}

function showHelp() {
	console.log(`
╔══════════════════════════════════════════════════════════════╗
║  COST ESTIMATION TERMINAL                                    ║
╚══════════════════════════════════════════════════════════════╝

Bloomberg-style TUI for estimating vectorization and LLM costs.

Usage:
  bun run src/index.tsx           # Start interactive terminal
  bun run src/index.tsx --help    # Show this help

Keyboard Controls:
  ←/→ or 1/2     Switch between Vectorization and LLM tabs
  r              Refresh data
  q              Quit
  Ctrl+C         Exit

Features:
  • Real-time library statistics from Supabase
  • Vectorization cost estimates (Replicate E5-Large)
  • LLM analysis cost comparison across models
  • Dense information display with color coding
`)
}

// =============================================================================
// Main
// =============================================================================

async function main() {
	const args = parseArgs()

	if (args.help) {
		showHelp()
		process.exit(0)
	}

	// Create the terminal renderer
	const renderer = await createCliRenderer({
		exitOnCtrlC: true,
		useAlternateScreen: false,
		useMouse: false,
		backgroundColor: BLOOMBERG.bg,
		targetFps: 30,
	})

	// Render the React app
	createRoot(renderer).render(<App />)
}

main().catch((error) => {
	console.error('Fatal error:', error)
	process.exit(1)
})
