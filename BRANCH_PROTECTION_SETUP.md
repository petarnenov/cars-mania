# Branch Protection Setup Guide

This guide explains how to set up branch protection rules to ensure merge requests to main can only be merged when CI is green.

## Prerequisites

- **Repository Admin Access**: You need admin permissions on the repository
- **CI Workflow**: The CI workflow must be properly configured (already done)

## Step-by-Step Setup

### 1. Navigate to Repository Settings

1. Go to your GitHub repository: `https://github.com/petarnenov/cars-mania`
2. Click on **Settings** tab
3. In the left sidebar, click **Branches**

### 2. Add Branch Protection Rule

1. Click **Add rule** or **Add branch protection rule**
2. In the **Branch name pattern** field, enter: `main`
3. Check the following options:

#### Required Status Checks

- ✅ **Require status checks to pass before merging**
- ✅ **Require branches to be up to date before merging**
- ✅ **Require conversation resolution before merging**

#### Status Checks to Require

Add these status checks (they should appear after CI runs):

- `build-and-test` (from CI workflow)
- `build-and-push-backend` (from CI workflow)  
- `build-and-push-frontend` (from CI workflow)

#### Additional Settings

- ✅ **Require a pull request before merging**
- ✅ **Require approvals** (set to 1 or more)
- ✅ **Dismiss stale PR approvals when new commits are pushed**
- ✅ **Require review from code owners** (if you have CODEOWNERS file)
- ✅ **Restrict pushes that create files**
- ✅ **Require linear history** (optional, but recommended)

### 3. Save the Rule

1. Click **Create** or **Save changes**
2. The rule will be applied immediately

## Verification

### Test the Protection

1. Create a new branch from main
2. Make some changes
3. Create a pull request to main
4. Verify that:
   - The merge button is disabled until CI passes
   - You cannot merge without the required status checks
   - The branch must be up to date with main

### Expected Behavior

- ✅ **CI passes**: Merge button becomes available
- ❌ **CI fails**: Merge button remains disabled
- ❌ **Branch behind main**: Merge button shows "Update branch" option
- ❌ **No approvals**: Merge button shows approval requirement

## CI Workflow Status Checks

The following status checks will be required based on your current CI workflow:

### `build-and-test`

- Runs on: `ubuntu-latest`
- Includes: Backend tests, Frontend tests, Linting, Type checking
- Timeout: 30 minutes

### `build-and-push-backend`

- Runs on: `ubuntu-latest`
- Includes: Docker build and push for backend
- Depends on: `build-and-test`

### `build-and-push-frontend`

- Runs on: `ubuntu-latest`
- Includes: Docker build and push for frontend
- Depends on: `build-and-test`

## Troubleshooting

### Status Checks Not Appearing

If status checks don't appear in the branch protection settings:

1. **Ensure CI runs on PRs**: Check that your workflow has:

   ```yaml
   on:
     pull_request:
       branches: [main]
   ```

2. **Check workflow permissions**: Ensure the workflow has proper permissions:

   ```yaml
   permissions:
     contents: read
     packages: write
   ```

3. **Wait for first run**: Status checks only appear after the first successful CI run

### Merge Button Still Available

If the merge button is still available when it shouldn't be:

1. **Check branch protection is active**: Go to Settings → Branches
2. **Verify status checks are required**: Ensure the correct checks are selected
3. **Check PR is targeting main**: Protection only applies to main branch

### CI Fails but Merge is Allowed

1. **Check status check requirements**: Ensure all required checks are selected
2. **Verify branch is up to date**: Protection requires branch to be current
3. **Check admin override**: Admins can bypass protection (disable if needed)

## Advanced Configuration

### Code Owners (Optional)

Create a `.github/CODEOWNERS` file to require specific reviewers:

```text
# Global owners
* @petarnenov

# Backend specific
backend/ @backend-team

# Frontend specific  
frontend/ @frontend-team

# Documentation
*.md @docs-team
```

### Required Reviewers

In branch protection settings, you can also:

- Require specific reviewers
- Require review from code owners
- Set minimum number of approvals

### Restrict Dismissals

- **Allow specified actors to dismiss pull request reviews**
- **Restrict who can dismiss pull request reviews**

## Security Benefits

This setup provides:

1. **Code Quality**: Ensures all code passes tests before merging
2. **Build Verification**: Confirms code builds successfully
3. **Review Process**: Requires human review before merging
4. **History Integrity**: Prevents force pushes to main
5. **Automated Checks**: Reduces human error in merge process

## Maintenance

### Regular Checks

- Monitor CI failure rates
- Review and update required status checks
- Adjust approval requirements as team grows
- Update CODEOWNERS as team changes

### Emergency Overrides

In emergency situations, repository admins can:

- Temporarily disable branch protection
- Force merge (if allowed)
- Override status checks (if configured)

**Note**: Always re-enable protection after emergency fixes.
