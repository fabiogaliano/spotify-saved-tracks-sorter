# Features Directory

This directory contains feature-focused modules that encapsulate specific functionality of the application.

## Structure

Each feature directory follows this structure:

- `actions/` - React Router actions related to the feature
- `loaders/` - React Router loaders related to the feature
- `components/` - React components specific to this feature
- `hooks/` - Custom React hooks specific to this feature
- `utils/` - Utility functions specific to this feature

## Features

- `auth/` - Authentication and authorization functionality
- `tracks/` - Track management and display
- `playlists/` - Playlist functionality
- `analysis/` - Music analysis features
- `matching/` - Track matching functionality

## Adding New Features

When adding a new feature:

1. Create a new directory with the feature name
2. Follow the established structure
3. Keep feature-specific code within the feature directory
4. Only move code to shared directories if it's used by multiple features
