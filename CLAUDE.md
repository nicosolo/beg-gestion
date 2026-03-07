# BEG Facture - Project Documentation

## Project Overview

BEG Facture is a fullstack invoicing application built with modern web technologies. The project uses a monorepo structure with separate applications for the API and web frontend.

## Tech Stack

- **Runtime**: Bun (v1.1.36+)
- **Backend**:
    - Hono (web framework)
    - Drizzle ORM with SQLite
    - JWT authentication
    - Zod validation
- **Frontend**:
    - Vue 3 with TypeScript
    - Vite as build tool
    - Vue Router for navigation
    - Pinia for state management
    - Tailwind CSS for styling
    - Vue I18n for internationalization
- **Database**: SQLite (migrated from MariaDB)
- **Development**: Docker Compose for containerized development

## Project Structure

```
.
├── apps/
│   ├── api/               # Backend API application
│   └── app/               # Frontend Vue application
├── packages/              # Shared packages
│   ├── types/            # Shared TypeScript types
│   ├── utils/            # Shared utilities
│   └── validations/      # Shared validation schemas
├── provision/
│   └── nginx/            # Nginx configuration
├── data/                 # Database files and legacy data
├── export-mdb/           # Exported data from legacy Access database
└── legacy/               # Legacy Delphi application files
```

## Development Setup

### Prerequisites

- Docker and Docker Compose (for containerized development)

### Running the Application

All development should be done using Docker Compose:

```bash
# Start all services with hot reload
docker compose up --watch

# Run in detached mode
docker compose up -d --watch

# Stop all services
docker compose down
```

## API (Backend)

The API is built with Hono and provides RESTful endpoints for:

- User authentication and management
- Projects management
- Activities/time tracking
- Clients management
- Rates and invoicing
- Status tracking

### Key Commands

Run all commands through Docker Compose:

- `docker compose exec api bun run dev` - Start API development server
- `docker compose exec api bun run db:generate` - Generate database migrations
- `docker compose exec api bun run db:migrate` - Run database migrations
- `docker compose exec api bun run db:seed` - Seed the database with initial data
- `docker compose exec api bun run build` - Build API for production

### Authentication

The API uses JWT tokens for authentication with middleware to protect routes.

## Frontend Application

The frontend is a Vue 3 SPA with:

- Component-based architecture (atoms, molecules, organisms pattern)
- Composables for API interaction and utilities
- Type-safe API client
- Internationalization support (French)

### Key Commands

Run all commands through Docker Compose:

- `docker compose exec app bun run dev` - Start Vite dev server
- `docker compose exec app bun run build` - Build for production
- `docker compose exec app bun run preview` - Preview production build

### IDE Setup

Recommended: VSCode with Volar extension for Vue 3 support

## Database

The project recently migrated from MariaDB to SQLite. Database files are stored in:

- Development: `apps/api/data/db.sqlite`
- Root: `data/db.sqlite`

## Recent Changes

Based on recent commits:

- Migrated from MariaDB to SQLite
- Removed deprecated regions table
- Refactored API routes with improved response validation
- Enhanced authentication middleware
- Updated database import logic with proper password hashing
- Improved type safety and error management in API composables

## Docker Development

The project uses Docker Compose for development:

- `compose.yml` - Development configuration
- `compose.prod.yml` - Production configuration

### Available Services

- **api**: Backend API running on port 4983
- **app**: Frontend Vue application (accessed via proxy)
- **proxy**: Nginx proxy running on port 8084 (main entry point)

### Accessing the Application

- Main application: http://localhost:8084
- API direct access: http://localhost:4983

### Common Docker Compose Commands

```bash
# View logs
docker compose logs -f [service_name]

# Restart a specific service
docker compose restart [service_name]

# Rebuild services
docker compose build

# Execute commands in a running container
docker compose exec [service_name] [command]
```

## Legacy System

The `legacy/` directory contains the original Delphi application (BEGfacture.dpr) that this system is replacing. The `export-mdb/` directory contains JSON exports from the legacy Access database.

## Important Notes

1. The project uses workspace dependencies managed by Bun
2. All packages use ES modules (`"type": "module"`)
3. The API includes a response validator tool for ensuring type safety
4. Database connections are configured for improved performance and concurrency
5. The frontend uses a structured component hierarchy for maintainability

## Contributing

When making changes:

1. Ensure TypeScript types are properly maintained
2. Run migrations when changing database schema
3. Update validation schemas in the shared validations package
4. Follow the existing component structure in the frontend
5. Maintain proper error handling and validation throughout

## Instructions

- Exclusively use english for all communication.
- **IMPORTANT**: Always use Docker Compose commands instead of running Bun directly
- All development commands should be executed inside the containers using `docker compose exec`
- The application runs in containers with automatic hot reload via Docker Compose watch mode

# important-instruction-reminders

Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (\*.md) or README files. Only create documentation files if explicitly requested by the User.

## Docker Compose Usage

- **ALWAYS** use `docker compose exec [service] [command]` instead of running commands directly
- **NEVER** run `bun` commands directly in the host system
- **ALWAYS** check if services are running with `docker compose ps` before executing commands
- For database operations, use: `docker compose exec api bun run db:[command]`
- For build operations, use: `docker compose exec [api|app] bun run build`

## Code Quality

Lint and type-check run on the host (not in Docker):

- `bun run lint:app` — lint & fix frontend
- `bun run lint:api` — lint & fix API
- `bun run lint:check:app` / `bun run lint:check:api` — lint without fix
- `bun run type-check:app` / `bun run type-check:api` — type-check

## Testing

- **IMPORTANT**: After any API modification (routes, repositories, tools, middleware), run tests: `docker compose exec api bun test --timeout 30000`
- Run a specific test file: `docker compose exec api bun test src/routes/__tests__/user.test.ts`
- Run tests matching a pattern: `docker compose exec api bun test activity`
- Tests use in-memory SQLite with `mock.module` to replace the DB singleton — see `src/__tests__/helpers/setup.ts`

## Tasks

To create tasks add the name of the feature as the file name and the date for the folder @tasks/{YYYY-MM-DD}/{feature_name}.md
