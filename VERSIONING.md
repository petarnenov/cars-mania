# Automatic Versioning System

This document describes the automatic versioning system used in the Cars Mania  
project to maintain consistent version numbers across frontend and backend.

## Overview

The versioning system automatically increments version numbers when changes are
committed, ensuring both frontend and backend stay in sync.

## How It Works

### Root Level

```bash
npm run version:patch  # Bump patch version (1.0.0 -> 1.0.1)
npm run version:minor  # Bump minor version (1.0.0 -> 1.1.0)
npm run version:major  # Bump major version (1.0.0 -> 2.0.0)
```

### Backend/Frontend

```bash
npm run version:patch  # Bump patch version
npm run version:minor  # Bump minor version
npm run version:major  # Bump major version
```

## Version Format

All packages use semantic versioning (SemVer):

- **Major**: Breaking changes
- **Minor**: New features (backward compatible)
- **Patch**: Bug fixes (backward compatible)

## Automatic Versioning

When you commit changes, the system automatically:

1. **Detects changes** in frontend or backend
2. **Increments appropriate version** (patch for most changes)
3. **Updates both packages** to maintain sync
4. **Creates git tags** for releases
5. **Updates changelog** with version information

## Manual Versioning

For manual version control:

```bash
# Bump specific version type
npm run version:patch  # 1.0.0 -> 1.0.1
npm run version:minor  # 1.0.0 -> 1.1.0
npm run version:major  # 1.0.0 -> 2.0.0

# Force specific version
npm version 1.2.3 --no-git-tag-version
```

## Configuration

### Root Level Configuration

- `package.json` contains version scripts
- `version-bump.js` handles automatic versioning logic
- Git hooks trigger version updates

### Package Level Configuration

- Each package has its own `package.json`
- Versions are synchronized automatically
- Independent versioning is possible if needed

## Best Practices

1. **Use semantic commits** for automatic version detection
2. **Test before versioning** to ensure stability
3. **Review changelog** after version updates
4. **Tag releases** for deployment tracking

## Troubleshooting

### Version Mismatch

If frontend and backend versions get out of sync:

```bash
# Reset to same version
npm run version:reset

# Or manually set versions
cd backend && npm version 1.0.0 --no-git-tag-version
cd ../frontend && npm version 1.0.0 --no-git-tag-version
```

### Git Tag Issues

If git tags aren't created:

```bash
# Check git configuration
git config --get user.name
git config --get user.email

# Create tag manually
git tag v1.0.0
git push origin v1.0.0
```

## Integration with CI/CD

The versioning system integrates with GitHub Actions:

- **Automatic versioning** on main branch commits
- **Version tags** trigger deployments
- **Changelog generation** for releases
- **Docker image tagging** with versions

## Version History

### Recent Versions

- **v2.3.0**: Production deployment feature
- **v2.2.0**: Enhanced test coverage
- **v2.1.0**: Rate limiting improvements
- **v2.0.0**: Major refactoring and features

### Version Increment Logic

- **Patch**: Bug fixes, documentation updates
- **Minor**: New features, improvements
- **Major**: Breaking changes, major refactoring
