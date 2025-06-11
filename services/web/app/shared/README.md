# Shared Directory

This directory contains shared code that's used across multiple features of the application.

## Structure

- `components/` - Reusable UI components
  - `ui/` - Basic UI elements like buttons, inputs, etc.
  - `tracks/` - Track-related components
  - `home/` - Home page components
  - `auth/` - Authentication components
  - `navigation/` - Navigation components
  - `forms/` - Form components
- `layouts/` - Layout components used across multiple routes
- `hooks/` - Custom React hooks used across multiple features
- `utils/` - Utility functions used across multiple features

## Guidelines

- Only place code here if it's used by multiple features
- Follow consistent naming patterns
- Group related files in folders with clear names
- Keep components focused and small
- Document components with prop types
- Maintain separation of concerns
