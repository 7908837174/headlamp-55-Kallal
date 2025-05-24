# Creating a Clean Pull Request for Checksum Verification

This document provides instructions for creating a clean pull request with only the checksum verification changes.

## Files Included

1. **create-clean-pr.bat**: Script to create a clean branch with only the checksum verification changes
2. **create-pull-request-instructions.md**: Instructions for creating a pull request on GitHub
3. **sign-cla-instructions.md**: Instructions for signing the CLA

## Steps to Follow

### Step 1: Create a Clean Branch

1. Run the `create-clean-pr.bat` script:
   ```
   create-clean-pr.bat
   ```

   This script will:
   - Set up a Git repository in the headlamp-55-Kallal directory
   - Create a new branch called `checksum-verification-clean`
   - Add only the files related to checksum verification
   - Commit the changes with a detailed commit message
   - Push the changes to GitHub

2. If prompted, enter your GitHub username and password (or personal access token).

### Step 2: Create a Pull Request

Follow the instructions in `create-pull-request-instructions.md` to create a pull request from your branch to the kubernetes-sigs/headlamp repository.

### Step 3: Sign the CLA

If the CLA check fails on your pull request, follow the instructions in `sign-cla-instructions.md` to sign the Contributor License Agreement.

## Files Included in the Pull Request

The pull request will include only the following files:

1. **app/scripts/setup-plugins.js**: Enhanced with checksum verification
2. **container/fetch-plugins.sh**: Enhanced with checksum verification
3. **app/app-build-manifest.json**: Manifest file with plugin checksums
4. **container/build-manifest.json**: Manifest file with plugin checksums
5. **plugins/headlamp-plugin/scripts/generate-checksum.js**: Utility for generating checksums
6. **docs/plugin-checksum-verification.md**: Documentation for the checksum verification system
7. **scripts/test-checksum-verification.js**: Tests for the checksum verification functionality
8. **scripts/test-checksum-core.js**: Core tests for the checksum verification functionality

## Troubleshooting

If you encounter any issues:

1. **Authentication Issues**: Make sure you're using a personal access token if you have two-factor authentication enabled on your GitHub account.

2. **Push Failures**: If the push fails, try pushing manually:
   ```
   cd headlamp-55-Kallal
   git push -u origin checksum-verification-clean
   ```

3. **CLA Issues**: If you have trouble signing the CLA, contact the Linux Foundation support team.

4. **PR Creation Issues**: If you have trouble creating the PR through the GitHub UI, you can also create it using the GitHub CLI:
   ```
   gh pr create --base kubernetes-sigs/headlamp:main --head 7908837174/headlamp-55-Kallal:checksum-verification-clean --title "Add checksum verification to plugin bundling scripts" --body "Description here..."
   ```