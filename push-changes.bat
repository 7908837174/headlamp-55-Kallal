@echo off
REM Script to push changes to GitHub

echo Setting up Git repository...
cd %~dp0headlamp-55-Kallal
git init
git add .
git config --local user.name "Kallal Mukherjee"
git config --local user.email "kallal@example.com"
git commit -m "Add checksum verification to plugin bundling scripts

This commit adds SHA256 checksum verification to the plugin bundling scripts
to ensure the integrity and security of downloaded plugins.

The implementation:
- Enhances app/scripts/setup-plugins.js to verify checksums when downloading plugins
- Enhances container/fetch-plugins.sh to verify checksums when downloading plugins
- Adds plugins/headlamp-plugin/scripts/generate-checksum.js utility for generating checksums
- Adds manifest files with plugin checksums
- Adds comprehensive tests for checksum verification
- Adds documentation for the checksum verification system

The implementation ensures that plugins downloaded during the build process
or at runtime match their expected checksums, preventing security issues
that could arise from corrupted or tampered plugin files."

echo Adding remote repository...
git remote add origin https://github.com/7908837174/headlamp-55-Kallal.git

echo Creating and switching to new branch...
git checkout -b add-checksum-verification

echo Pushing changes to GitHub...
git push -u origin add-checksum-verification

echo Done!