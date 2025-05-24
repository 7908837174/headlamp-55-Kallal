# Plugin Checksum Verification

This document describes the checksum verification system implemented for Headlamp plugins to ensure their integrity and security.

## Overview

The checksum verification system ensures that plugin packages downloaded during the build process or at runtime match their expected checksums. This helps prevent security issues that could arise from corrupted or tampered plugin files.

## Implementation

The checksum verification has been implemented in the following components:

1. **Plugin Bundling Scripts**:
   - `app/scripts/setup-plugins.js`: Downloads and verifies plugins for the Electron app
   - `container/fetch-plugins.sh`: Downloads and verifies plugins for the container image

2. **Manifest Files**:
   - `app/app-build-manifest.json`: Defines plugins for the Electron app
   - `container/build-manifest.json`: Defines plugins for the container image

3. **Utility Scripts**:
   - `plugins/headlamp-plugin/scripts/generate-checksum.js`: Generates SHA256 checksums for plugin packages

## How It Works

1. Plugin information, including name, version, URL, and checksum, is stored in manifest files.
2. When plugins are downloaded, their SHA256 checksums are calculated and compared with the expected checksums from the manifest.
3. If a checksum doesn't match, the plugin is rejected, and an error is reported.

## Using the Checksum Verification System

### Adding a Plugin with Checksum Verification

1. Build your plugin package:
   ```
   cd your-plugin-directory
   npm pack
   ```

2. Generate a checksum for the package:
   ```
   node plugins/headlamp-plugin/scripts/generate-checksum.js your-plugin-1.0.0.tgz
   ```

3. Add the plugin to the appropriate manifest file:
   ```json
   {
     "plugins": [
       {
         "name": "your-plugin",
         "version": "1.0.0",
         "url": "https://example.com/plugins/your-plugin-1.0.0.tgz",
         "checksum": "calculated-sha256-checksum"
       }
     ]
   }
   ```

4. Update an existing plugin's checksum in a manifest file:
   ```
   node plugins/headlamp-plugin/scripts/generate-checksum.js your-plugin-1.0.0.tgz --update-manifest path/to/manifest.json --plugin-name your-plugin --plugin-version 1.0.0
   ```

### Testing Checksum Verification

To test that the checksum verification is working correctly:

1. Modify a plugin package after calculating its checksum.
2. Try to download the modified package using the bundling scripts.
3. The scripts should reject the package due to checksum mismatch.

## Security Considerations

- Always include checksums in your manifest files to ensure plugin integrity.
- Keep your manifest files secure, as they define which plugins are trusted.
- Consider using a secure distribution channel for your plugins.

## Troubleshooting

If you encounter issues with checksum verification:

1. Ensure the manifest file contains the correct checksum for the plugin.
2. Verify that the plugin package hasn't been modified since the checksum was calculated.
3. Check that the download URL is correct and accessible.
4. Ensure the required tools (sha256sum or shasum) are available in your environment.

## Future Improvements

- Integration with a plugin registry for centralized checksum verification
- Support for additional hash algorithms
- Automatic checksum calculation during the plugin publishing process