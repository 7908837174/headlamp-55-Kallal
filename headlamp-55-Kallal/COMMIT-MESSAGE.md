Add checksum verification to plugin bundling scripts

This commit adds SHA256 checksum verification to the plugin bundling scripts
to ensure the integrity and security of downloaded plugins. The implementation
addresses issue #2539.

Changes:
- Enhanced app/scripts/setup-plugins.js to verify checksums when downloading plugins
- Enhanced container/fetch-plugins.sh to verify checksums when downloading plugins
- Added plugins/headlamp-plugin/scripts/generate-checksum.js utility for generating checksums
- Added manifest files with plugin checksums
- Added comprehensive tests for checksum verification
- Added documentation for the checksum verification system

The implementation ensures that plugins downloaded during the build process
or at runtime match their expected checksums, preventing security issues
that could arise from corrupted or tampered plugin files.

Fixes #2539