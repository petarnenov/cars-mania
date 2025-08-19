# Development Setup

This guide explains how to set up and run the Cars Mania application in development mode.

## Quick Start

1. **Start development services:**
   ```bash
   ./scripts/dev.sh start
   ```

2. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

3. **Stop development services:**
   ```bash
   ./scripts/dev.sh stop
   ```

## Development Scripts

The development server uses the same commands as production but with development-specific configurations:

```bash
./scripts/dev.sh start    # Start development services
./scripts/dev.sh stop     # Stop development services
./scripts/dev.sh restart  # Restart development services
./scripts/dev.sh update   # Update code and restart
./scripts/dev.sh status   # Show service status
./scripts/dev.sh logs     # Show service logs
./scripts/dev.sh health   # Perform health check
```

## Development Features

### Hot Reloading
- **Frontend**: Vite dev server with hot module replacement
- **Backend**: Nodemon with TypeScript support

### Volume Mounts
- Source code is mounted into containers for live updates
- Node modules are preserved in containers for performance

### Environment
- Uses `.env.development` configuration
- Development-specific JWT secrets
- Debug logging enabled

### Database
- Uses SQLite database at `prisma/dev.db`
- Database is persisted in `./prisma/` directory

## Development vs Production

| Feature | Development | Production |
|---------|-------------|------------|
| Frontend | Vite dev server (port 5173) | Nginx static files (port 80) |
| Backend | Nodemon with hot reload | Node.js production build |
| Database | SQLite dev.db | SQLite production.db |
| Logging | Debug level | Info level |
| JWT Secrets | Development defaults | Production secrets |

## Troubleshooting

### Services won't start
1. Check if Docker is running
2. Verify ports 3001 and 5173 are available
3. Check logs: `./scripts/dev.sh logs`

### Frontend not loading
1. Check if Vite dev server is running: `curl http://localhost:5173`
2. Check frontend logs: `docker logs cars-mania-frontend-dev`

### Backend API errors
1. Check if backend is running: `curl http://localhost:3001/api/health`
2. Check backend logs: `docker logs cars-mania-backend-dev`

### Database issues
1. Reset database: `rm prisma/dev.db && ./scripts/dev.sh restart`
2. Run migrations: `docker exec cars-mania-backend-dev npx prisma db push`

## File Structure

```
cars-mania/
├── docker-compose.dev.yml      # Development services
├── development.env.example     # Development env template
├── scripts/dev.sh             # Development management script
├── frontend/
│   └── Dockerfile.dev         # Development frontend build
└── backend/
    └── Dockerfile             # Backend build (shared)
```
