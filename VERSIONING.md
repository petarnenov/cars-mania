# Automatic Versioning System

This project includes an automatic versioning system that bumps versions for both frontend and backend packages on each commit.

## How It Works

The versioning system automatically increments versions based on commit messages and staged files:

- **Patch** (1.0.0 → 1.0.1): Bug fixes, documentation updates
- **Minor** (1.0.0 → 1.1.0): New features, non-breaking changes
- **Major** (1.0.0 → 2.0.0): Breaking changes

## Setup

1. **Install dependencies:**
   ```bash
   npm run install:all
   ```

2. **Set up Git hooks:**
   ```bash
   npm run setup:git-hooks
   ```

## Usage

### Automatic Versioning (Recommended)

The system automatically bumps versions on commits when source files are modified:

```bash
git add .
git commit -m "feat: add new user authentication"
# Automatically bumps minor version
```

### Manual Versioning

You can manually bump versions using npm scripts:

```bash
# Bump patch version (1.0.0 → 1.0.1)
npm run version:patch

# Bump minor version (1.0.0 → 1.1.0)
npm run version:minor

# Bump major version (1.0.0 → 2.0.0)
npm run version:major

# Auto-detect version type from commit message
npm run version:auto
```

### Commit Message Conventions

The system detects version type from commit messages:

- **Major**: `breaking`, `major`
- **Minor**: `feat`, `feature`, `minor`
- **Patch**: Everything else (default)

Examples:
```bash
git commit -m "feat: add car search functionality"  # Minor bump
git commit -m "fix: resolve login bug"             # Patch bump
git commit -m "breaking: change API endpoints"     # Major bump
```

## Scripts

### Root Level
- `npm run version:patch` - Bump patch version
- `npm run version:minor` - Bump minor version
- `npm run version:major` - Bump major version
- `npm run version:auto` - Auto-detect version type
- `npm run setup:git-hooks` - Set up automatic versioning

### Backend/Frontend
- `npm run version:patch` - Bump patch version
- `npm run version:minor` - Bump minor version
- `npm run version:major` - Bump major version
- `npm run version:auto` - Auto-detect version type

## Configuration

### Disabling Automatic Versioning

To disable automatic versioning, remove the pre-commit hook:

```bash
rm .git/hooks/pre-commit
```

### Customizing Version Logic

Edit `scripts/version.js` to customize:
- Version increment logic
- Commit message parsing
- Package.json file paths

## Files

- `scripts/version.js` - Main versioning logic
- `scripts/pre-commit.js` - Git pre-commit hook
- `scripts/setup-git-hooks.js` - Hook setup script
- `package.json` - Root package with scripts
- `backend/package.json` - Backend package
- `frontend/package.json` - Frontend package

## Current Versions

- **Backend**: 1.0.0
- **Frontend**: 0.0.0
- **Root**: 1.0.0

## Notes

- Versions are synchronized between frontend and backend
- The system only bumps versions when source files are modified
- Version bumps are automatically staged in Git
- All version changes are logged to console
