# Spotify Auto Sort Liked Songs - Application Structure

This document outlines the structure of the application after refactoring.

## Directory Structure

- `app/`
  - `features/` - Feature-focused modules
    - `auth/` - Authentication functionality
    - `tracks/` - Track management
    - `playlists/` - Playlist functionality
    - `analysis/` - Music analysis
    - `matching/` - Track matching
  - `shared/` - Shared components and utilities
    - `components/` - Reusable UI components
    - `layouts/` - Layout components
    - `hooks/` - Custom React hooks
    - `utils/` - Utility functions
  - `lib/` - Core infrastructure
    - `api/` - API clients
    - `db/` - Database access
    - `models/` - Domain models
    - `repositories/` - Data access layer
    - `services/` - Application services
    - `stores/` - State management
  - `routes/` - React Router routes
  - `types/` - TypeScript type definitions

## Architecture Principles

1. **Feature-First Organization**: Code is organized around features rather than technical concerns
2. **Separation of Concerns**: Clear boundaries between UI, application logic, and data access
3. **Shared Components**: Reusable components are in the shared directory
4. **Domain-Driven Design**: Core business logic is modeled in the lib directory
5. **Composition over Inheritance**: Components are composed rather than extended

## Development Workflow

When adding new functionality:

1. Identify which feature it belongs to
2. Add code to the appropriate feature directory
3. If code is used by multiple features, move it to shared or lib
4. Update routes to compose the new functionality
5. Follow established patterns and naming conventions

## Import Conventions

- Use absolute imports with the `~` alias
- Example: `import { Component } from '~/shared/components/Component'`
- Order imports: React, React Router, third-party, application

## State Management

- Zustand stores are used for global state
- Store files are organized in lib/stores
- Each store has a specific responsibility
- UI components access stores through hooks
