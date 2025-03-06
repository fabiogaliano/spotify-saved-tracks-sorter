# Spotify Auto Sort Liked Songs

An application for automatically sorting your Spotify liked songs into playlists using AI.

## Features

- Connect to your Spotify account
- View and filter your liked songs
- Analyze your music for sorting
- Automatically sort songs into playlists
- Match songs with similar tracks
- Securely manage AI provider API keys

### Directory Structure

```
app/
├── features/            # Feature modules
│   ├── auth/            # Authentication
│   ├── tracks/          # Track management
│   ├── playlists/       # Playlist functionality
│   ├── analysis/        # Music analysis
│   └── matching/        # Track matching
├── shared/              # Shared components and utilities
│   ├── components/      # Reusable UI components
│   ├── layouts/         # Layout components
│   ├── hooks/           # Custom React hooks
│   └── utils/           # Utility functions
├── lib/                 # Core infrastructure
│   ├── api/             # API clients
│   ├── db/              # Database access
│   ├── models/          # Domain models
│   ├── repositories/    # Data access
│   ├── services/        # Application services
│   └── stores/          # State management
├── routes/              # Hierarchical routes
│   └── auth/            # Auth routes
└── types/               # TypeScript types
```

## Technology Stack

- [Remix](https://remix.run/) - Full-stack web framework
- [React](https://reactjs.org/) - UI library
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Supabase](https://supabase.io/) - Backend as a Service
- [Spotify Web API](https://developer.spotify.com/documentation/web-api/) - Spotify API
- [Zustand](https://github.com/pmndrs/zustand) - State management
- [Node.js Crypto](https://nodejs.org/api/crypto.html) - For secure encryption

## Development

### Prerequisites

- Node.js 20+
- bun
- Spotify Developer Account

### Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in required values
3. Install dependencies: `bun install`
4. Start the development server: `bun run dev`

# Welcome to Remix!

- 📖 [Remix docs](https://remix.run/docs)

## Development

Run the dev server:

```shellscript
bun run dev
```

## Deployment

First, build your app for production:

```sh
bun run build
```

Then run the app in production mode:

```sh
bun run start
```

Now you'll need to pick a host to deploy it to.

### DIY

If you're familiar with deploying Node applications, the built-in Remix app server is production-ready.

Make sure to deploy the output of `npm run build`

- `build/server`
- `build/client`

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever css framework you prefer. See the [Vite docs on css](https://vitejs.dev/guide/features.html#css) for more information.
