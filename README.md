# Headlamp Plugin Checksum Verification - Auto Fix

This package provides an automated solution to fix the issue with plugin bundling scripts not checking checksums when downloading plugins (issue #2539).

## Quick Start

1. Run the auto-fix script:
   ```
   run-auto-fix.bat
   ```

2. Update existing manifest files with checksums:
   ```
   update-manifests.bat
   ```

## What Gets Fixed

The auto-fix script modifies the following files:

1. `container/fetch-plugins.sh` - Adds checksum verification
2. `app/scripts/setup-plugins.js` - Adds checksum verification
3. Creates `plugins/headlamp-plugin/scripts/generate-checksum.js` utility

## How It Works

1. The auto-fix script modifies the plugin bundling scripts to verify checksums
2. The manifest updater downloads plugins from existing manifest files and adds checksums
3. Future plugin downloads will be verified against these checksums

## Manual Steps

If the auto-fix doesn't work, you can:

1. Copy `fetch-plugins-fixed.sh` to `container/fetch-plugins.sh`
2. Copy `setup-plugins-fixed.js` to `app/scripts/setup-plugins.js`
3. Create the `generate-checksum.js` utility manually

## Testing

After applying the fix, test with:

1. Valid checksums (should succeed)
2. Invalid checksums (should fail with error)
3. Missing checksums (should warn but continue)