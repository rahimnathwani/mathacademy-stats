# Firefox Add-ons (AMO) Release Guide

This guide covers everything you need to prepare and submit your extension to Firefox Add-ons (addons.mozilla.org).

## Prerequisites Checklist

### ✅ Already Complete
- [x] Firefox build configuration (`pnpm run build:firefox`)
- [x] Firefox zip packaging (`pnpm run zip:firefox`)
- [x] Icons in all required sizes (16, 32, 48, 96, 128px)
- [x] GitHub Actions workflow builds Firefox extension
- [x] Manifest V2 compatibility (WXT handles this automatically)

### 🔲 To Do Before Submission

1. **Create Firefox Add-ons Developer Account**
   - Go to https://addons.mozilla.org/developers/
   - Sign in with your Firefox Account (or create one)
   - Complete developer registration

2. **Prepare Extension Assets**
   - **Screenshots**: Create at least one screenshot (1280x720 or 1280x800 recommended)
     - Current screenshot: `screenshot.png` (verify dimensions)
   - **Icon**: Already have icons in `public/icon/` (16, 32, 48, 96, 128px)
   - **Privacy Policy**: May be required if extension collects user data
     - Your extension fetches data from Math Academy API
     - Consider creating a privacy policy page

3. **Test Firefox Build Locally**
   ```bash
   # Build Firefox extension
   pnpm run build:firefox
   
   # Create zip for submission
   pnpm run zip:firefox
   ```
   
   Test the extension:
   - Go to `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Select `.output/firefox-mv2/manifest.json`
   - Test all functionality thoroughly

4. **Verify Manifest Compatibility**
   - The generated manifest should be Manifest V2 compatible
   - Check `.output/firefox-mv2/manifest.json` after building
   - Note: Firefox MV2 doesn't support `world: "MAIN"` in content scripts, but WXT should handle this

## Submission Process

### Step 1: Prepare Your Submission Package

1. Build the Firefox extension:
   ```bash
   pnpm run build:firefox
   pnpm run zip:firefox
   ```

2. The zip file will be created at `.output/firefox-mv2.zip`

### Step 2: Submit to AMO

1. Go to https://addons.mozilla.org/developers/addon/submit/
2. Choose "On this site" (public listing) or "On your own" (self-distribution)
3. Upload the zip file (`.output/firefox-mv2.zip`)

### Step 3: Fill Out Listing Information

**Required Information:**
- **Name**: Math Academy Stats
- **Summary**: Short description (e.g., "Analyze your Math Academy activity data with statistics, exports, and performance insights")
- **Description**: Full description (can use content from README.md)
- **Categories**: Select appropriate categories (e.g., "Education", "Productivity")
- **Tags**: Add relevant tags (e.g., "math", "education", "statistics", "analytics")

**Optional but Recommended:**
- **Homepage**: Your GitHub repository URL
- **Support URL**: GitHub issues page
- **Screenshots**: Upload `screenshot.png` (or create new ones)
- **Privacy Policy**: If required, create a privacy policy page

### Step 4: Review Process

- **Automated Review**: AMO runs automated checks (usually completes in minutes)
- **Manual Review**: May take 1-7 days for new extensions
- **Review Criteria**:
  - Code quality and security
  - Privacy practices
  - Functionality and user experience
  - Compliance with AMO policies

### Step 5: Post-Submission

Once approved:
- Extension will be available at `https://addons.mozilla.org/firefox/addon/[your-addon-id]/`
- Update README.md with Firefox Add-ons link
- Consider adding automatic updates via AMO's update URL

## Common Issues and Solutions

### Issue: Manifest Validation Errors
- **Solution**: WXT should handle MV2 conversion automatically, but verify the generated manifest
- Check that `host_permissions` are converted to `permissions` in MV2

### Issue: Content Script World Property
- **Problem**: Firefox MV2 doesn't support `world: "MAIN"` property
- **Solution**: WXT should remove this for Firefox builds, but verify in generated manifest

### Issue: Privacy Policy Required
- **Solution**: Create a privacy policy page explaining:
  - What data is collected (user's Math Academy activity data)
  - How it's used (local analysis, no external transmission)
  - Where it's stored (browser local storage)
  - Data sharing (none)

### Issue: Screenshot Requirements
- **Minimum**: 1 screenshot required
- **Recommended**: 2-5 screenshots showing key features
- **Dimensions**: 1280x720 or 1280x800 (16:9 or 16:10 aspect ratio)

## Privacy Policy Template

If you need to create a privacy policy, here's a template:

```markdown
# Privacy Policy for Math Academy Stats Extension

## Data Collection
This extension fetches your Math Academy activity data directly from Math Academy's API when you click "Get Activity Data" in the extension popup.

## Data Storage
All data is stored locally in your browser using the browser's local storage API. No data is transmitted to any external servers except Math Academy's API (which you are already using when logged into Math Academy).

## Data Usage
The extension uses your activity data to:
- Generate statistics and performance metrics
- Export data to JSON/CSV formats
- Display visualizations and charts

## Data Sharing
This extension does not share your data with any third parties. All processing happens locally in your browser.

## Permissions
- `storage`: To temporarily store statistics between popup and stats pages
- `tabs`: To open statistics pages in new tabs and detect the current Math Academy hostname
- `https://mathacademy.com/*` and `https://www.mathacademy.com/*`: To fetch your activity data from Math Academy's API

## Contact
For questions about this privacy policy, please open an issue on GitHub: [your-repo-url]
```

## Automated Updates (Future Enhancement)

After initial submission, you can set up automatic updates:

1. AMO provides an update URL for your extension
2. Add update URL to manifest (though WXT/AMO handles this automatically)
3. Future releases will auto-update for users who installed from AMO

## Resources

- [Firefox Add-ons Developer Hub](https://addons.mozilla.org/developers/)
- [AMO Review Policies](https://extensionworkshop.com/documentation/publish/add-on-policies/)
- [Manifest V2 Documentation](https://extensionworkshop.com/documentation/develop/manifest-v2/)
- [WXT Firefox Documentation](https://wxt.dev/guide/browser-targets.html#firefox)

## Quick Reference Commands

```bash
# Build Firefox extension
pnpm run build:firefox

# Create zip for submission
pnpm run zip:firefox

# Test locally
# Then load .output/firefox-mv2/manifest.json in about:debugging

# Check generated manifest
cat .output/firefox-mv2/manifest.json
```
