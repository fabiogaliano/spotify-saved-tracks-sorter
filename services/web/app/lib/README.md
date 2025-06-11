# Library Directory

This directory contains core infrastructure code for the application.

## Structure

- `api/` - API clients and interfaces for external services
- `db/` - Database access and data persistence
- `models/` - Domain models and type definitions
- `repositories/` - Data access layer abstracting storage details
- `services/` - Application services encapsulating business logic
- `stores/` - State management (Zustand stores)

## Guidelines

- Keep code in this directory framework-agnostic where possible
- Focus on business logic rather than UI concerns
- Use clear interfaces between layers
- Follow consistent naming patterns
- Document key abstractions and expected usage
- Write unit tests for critical business logic
- Implement proper error handling

## Adding New Libraries

When adding new libraries:

1. Consider which subdirectory it belongs in
2. Create interfaces to abstract third-party dependencies
3. Document expected usage and edge cases
4. Follow established patterns for error handling
