// vitest.config.ts
/// <reference types="vitest" />

import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
	plugins: [tsconfigPaths()],
	test: {
		include: ['./app/**/*.{test,spec}.{js,ts}'],
		globals: true,
		setupFiles: ['./tests/setup.ts'],
	},
})
