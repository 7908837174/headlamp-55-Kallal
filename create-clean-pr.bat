@echo off
REM Script to create a clean PR with only checksum verification changes

echo Setting up Git repository...
cd %~dp0headlamp-55-Kallal

REM Check if .git directory exists
if not exist .git (
  echo Initializing Git repository...
  git init
  git remote add origin https://github.com/7908837174/headlamp-55-Kallal.git
  git fetch origin
  git checkout -b main origin/main
) else (
  echo Git repository already exists, updating...
  git fetch origin
)

REM Create a new branch for the clean PR
echo Creating new branch for checksum verification...
git checkout -b checksum-verification-clean

REM Add only the files related to checksum verification
echo Adding checksum verification files...

REM Create directories if they don't exist
if not exist app\scripts mkdir app\scripts
if not exist container mkdir container
if not exist plugins\headlamp-plugin\scripts mkdir plugins\headlamp-plugin\scripts
if not exist docs mkdir docs
if not exist scripts mkdir scripts

REM Copy the modified files
copy /Y %~dp0headlamp-55-Kallal\app\scripts\setup-plugins.js app\scripts\
copy /Y %~dp0headlamp-55-Kallal\container\fetch-plugins.sh container\
copy /Y %~dp0headlamp-55-Kallal\app\app-build-manifest.json app\
copy /Y %~dp0headlamp-55-Kallal\container\build-manifest.json container\
copy /Y %~dp0headlamp-55-Kallal\plugins\headlamp-plugin\scripts\generate-checksum.js plugins\headlamp-plugin\scripts\
copy /Y %~dp0headlamp-55-Kallal\docs\plugin-checksum-verification.md docs\
copy /Y %~dp0headlamp-55-Kallal\scripts\test-checksum-verification.js scripts\
copy /Y %~dp0headlamp-55-Kallal\scripts\test-checksum-core.js scripts\

REM Add the files to git
git add app/scripts/setup-plugins.js
git add container/fetch-plugins.sh
git add app/app-build-manifest.json
git add container/build-manifest.json
git add plugins/headlamp-plugin/scripts/generate-checksum.js
git add docs/plugin-checksum-verification.md
git add scripts/test-checksum-verification.js
git add scripts/test-checksum-core.js

REM Commit the changes
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

REM Push the changes
echo Pushing changes to GitHub...
git push -u origin checksum-verification-clean

echo Done!
echo.
echo Next steps:
echo 1. Go to https://github.com/7908837174/headlamp-55-Kallal
echo 2. Click on "Compare & pull request" for the checksum-verification-clean branch
echo 3. Set the base repository to kubernetes-sigs/headlamp and base branch to main
echo 4. Fill in the PR details and create the PR
echo 5. Sign the CLA if prompted