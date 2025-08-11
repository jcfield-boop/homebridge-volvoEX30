# Release Workflow

This document outlines the proper release workflow for the Homebridge Volvo EX30 plugin to ensure consistency and proper Homebridge UI integration.

## Pre-Release Checklist

### 1. Code Quality
- [ ] All tests pass (if applicable)
- [ ] Code builds successfully (`npm run build`)
- [ ] No linting errors (`npm run lint`)
- [ ] TypeScript compiles without errors (`npm run typecheck`)

### 2. Documentation Updates
- [ ] Update CHANGELOG.md with new version entry
- [ ] Follow [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format
- [ ] Include sections: Added, Changed, Fixed, Removed, Security (as applicable)
- [ ] Date format: YYYY-MM-DD

### 3. Version Management
- [ ] Ensure changelog has placeholder version (e.g., `## [Unreleased] - YYYY-MM-DD`)
- [ ] **DO NOT** manually edit package.json version

## Release Process

### Step 1: Prepare Release
```bash
# Update changelog with version content
# Leave version as [Unreleased] for now
git add CHANGELOG.md
git commit -m "Prepare release notes for next version"
```

### Step 2: Version Bump
```bash
# This automatically updates package.json and creates git tag
npm version patch  # or minor/major as appropriate
```

### Step 3: Update Changelog Version
```bash
# Update CHANGELOG.md to match package.json version
# Change [Unreleased] to [1.2.X] matching package.json
git add CHANGELOG.md
git commit -m "Update changelog version to match release"
```

### Step 4: Push Changes
```bash
# Push commits and tags
git push origin main
git push origin --tags
```

### Step 5: Create GitHub Release
```bash
# Extract version from package.json
VERSION=$(node -p "require('./package.json').version")

# Create GitHub release with changelog content
gh release create "v$VERSION" \
  --title "v$VERSION - Brief Description" \
  --notes "$(extract release notes from CHANGELOG.md)"
```

### Step 6: Publish to npm
```bash
npm publish
```

## Post-Release Verification

### Homebridge UI Integration Check
- [ ] GitHub release exists for the version
- [ ] Release has proper title and description
- [ ] Release notes are formatted for readability
- [ ] npm package version matches GitHub release tag
- [ ] Changelog version matches published version

### Version Consistency Check
- [ ] package.json version matches git tag
- [ ] CHANGELOG.md header version matches package.json
- [ ] GitHub release tag matches package.json version
- [ ] npm published version matches all of the above

## Common Mistakes to Avoid

### ❌ Don't Do This
- Don't manually edit package.json version
- Don't create git tags manually
- Don't forget to create GitHub releases
- Don't skip changelog updates
- Don't use inconsistent version numbers

### ✅ Do This Instead
- Use `npm version patch/minor/major`
- Always create GitHub releases for Homebridge UI integration
- Keep changelog updated and properly formatted
- Ensure version consistency across all files
- Follow semantic versioning

## GitHub Release Requirements

For proper Homebridge UI integration, every release MUST have:

1. **Git Tag**: Created by `npm version`
2. **GitHub Release**: Created with `gh release create`
3. **Release Title**: Format: `v1.2.3 - Brief Description`
4. **Release Notes**: Formatted changelog content with:
   - Clear section headers (Added, Fixed, Changed, etc.)
   - Bullet points for easy reading
   - Technical details where relevant
   - User-facing benefit descriptions

## Example Release Notes Format

```markdown
## 🔧 Feature Improvements

### Added
- New OAuth flow with enhanced security
- Better error handling for API timeouts

### Fixed  
- Resolved server loading issues
- Fixed token refresh problems

### Changed
- Updated to modern plugin-ui-utils patterns
- Simplified configuration process

This release improves reliability and user experience with enhanced OAuth handling.
```

## Automation Ideas

Consider adding these to improve the process:

1. **Pre-commit hook** to verify changelog is updated
2. **GitHub Action** to auto-create releases from tags
3. **Version sync script** to validate consistency
4. **Release template** for consistent formatting

## Emergency Patch Process

For critical fixes that need immediate release:

1. Create hotfix branch from main
2. Make minimal necessary changes
3. Follow normal release process
4. Use `npm version patch` for patch increment
5. Mention "HOTFIX" in release title