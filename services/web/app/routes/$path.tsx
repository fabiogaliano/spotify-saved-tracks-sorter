import React from 'react'

import { Link, LoaderFunction, MetaFunction, useRouteError } from 'react-router'

export const meta: MetaFunction = () => {
	return [
		{ title: '404 - Page Not Found | Sorted' },
		{ name: 'description', content: 'The page you are looking for does not exist.' },
	]
}

export const loader: LoaderFunction = async () => {
	return new Response('404 Not Found', { status: 404 })
}

export default function NotFound() {
	return (
		<div className="bg-theme-gradient text-foreground flex min-h-screen flex-col">
			{/* Nav */}
			<nav className="bg-background/50 border-border/50 sticky top-0 z-10 flex items-center justify-between border-b px-6 py-5 backdrop-blur-sm md:px-12">
				<div className="flex items-center">
					<Link to="/" className="bg-gradient-brand text-2xl font-bold md:text-3xl">
						Sorted.
					</Link>
				</div>
			</nav>

			{/* 404 Content */}
			<div className="flex flex-grow items-center justify-center px-6 py-12 md:px-12">
				<div className="bg-background/30 border-border relative mx-auto max-w-3xl overflow-hidden rounded-2xl border p-10 text-center backdrop-blur-sm">
					{/* Glow effects */}
					<div className="absolute -top-20 -left-10 h-64 w-64 rounded-full bg-purple-500 opacity-10 blur-3xl filter"></div>
					<div className="absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-blue-500 opacity-10 blur-3xl filter"></div>

					<div className="relative z-10">
						<div className="bg-gradient-brand mb-6 text-9xl font-bold opacity-80">
							404
						</div>
						<h1 className="mb-6 text-4xl font-bold md:text-5xl">Page Not Found</h1>
						<p className="text-muted-foreground mb-10 text-xl md:text-2xl">
							The page you're looking for doesn't exist or has been moved.
						</p>
						<Link
							to="/"
							className="text-foreground inline-block rounded-full bg-green-500 px-10 py-4 text-center text-xl font-medium transition-all hover:bg-green-400"
						>
							Back to Home
						</Link>
					</div>
				</div>
			</div>

			{/* Footer */}
			<footer className="bg-background/50 border-border border-t py-8 backdrop-blur-md">
				<div className="container mx-auto px-6 md:px-12">
					<div className="flex flex-col items-center justify-between md:flex-row">
						<div className="mb-6 md:mb-0">
							<div className="bg-gradient-brand text-xl font-bold md:text-2xl">
								Sorted.
							</div>
							<div className="text-muted-foreground mt-2 text-sm">
								From likes to perfect playlists.
							</div>
						</div>
						<div className="text-muted-foreground/70 text-center text-sm">
							2025 Sorted. Not affiliated with Spotify. All rights reserved.
						</div>
					</div>
				</div>
			</footer>
		</div>
	)
}
