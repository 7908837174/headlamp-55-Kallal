#!/usr/bin/env node

/**
 * Auto-fix script for adding checksum verification to plugin bundling scripts
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// Project root directory
const projectRoot = path.resolve(__dirname, 'headlamp-55-Kallal');

// Files to modify
const filesToFix = {
  fetchPlugins: path.join(projectRoot, 'container', 'fetch-plugins.sh'),
  setupPlugins: path.join(projectRoot, 'app', 'scripts', 'setup-plugins.js')
};

// Function to calculate SHA256 checksum of a file
function calculateChecksum(filePath) {
  const fileContent = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileContent).digest('hex');
}

// Function to fix fetch-plugins.sh
function fixFetchPluginsScript() {
  console.log('Fixing fetch-plugins.sh...');
  
  const filePath = filesToFix.fetchPlugins;
  if (!fs.existsSync(filePath)) {
    console.error(`Error: ${filePath} not found`);
    return false;
  }
  
  // Read the original file
  const originalContent = fs.readFileSync(filePath, 'utf8');
  
  // Create the fixed content
  const fixedContent = `#!/bin/bash
# Enhanced fetch-plugins.sh with checksum verification

set -e

SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
MANIFEST_FILE="\${SCRIPT_DIR}/build-manifest.json"
PLUGINS_DIR="\${1:-/headlamp/plugins}"

# Create plugins directory if it doesn't exist
mkdir -p "\${PLUGINS_DIR}"

# Function to download and verify a plugin
download_and_verify_plugin() {
  local name="$1"
  local version="$2"
  local url="$3"
  local checksum="$4"
  local output_file="\${PLUGINS_DIR}/\${name}-\${version}.tgz"
  
  echo "Downloading plugin: \${name} v\${version}"
  
  # Download the plugin
  if ! curl -sSL "\${url}" -o "\${output_file}"; then
    echo "Error downloading \${name} v\${version} from \${url}"
    return 1
  fi
  
  # Verify checksum if provided
  if [ -n "\${checksum}" ]; then
    echo "Verifying checksum for \${name} v\${version}"
    
    # Calculate SHA256 checksum
    local calculated_checksum
    if command -v sha256sum > /dev/null; then
      calculated_checksum=$(sha256sum "\${output_file}" | cut -d ' ' -f 1)
    elif command -v shasum > /dev/null; then
      calculated_checksum=$(shasum -a 256 "\${output_file}" | cut -d ' ' -f 1)
    else
      echo "Warning: No checksum tool found (sha256sum or shasum). Skipping verification."
      return 0
    fi
    
    # Compare checksums
    if [ "\${calculated_checksum}" != "\${checksum}" ]; then
      echo "Error: Checksum verification failed for \${name} v\${version}"
      echo "Expected: \${checksum}"
      echo "Got:      \${calculated_checksum}"
      rm -f "\${output_file}"
      return 1
    fi
    
    echo "Checksum verified for \${name} v\${version}"
  else
    echo "Warning: No checksum provided for \${name} v\${version}. Skipping verification."
  fi
}

# Parse the manifest file and download plugins
if [ -f "\${MANIFEST_FILE}" ]; then
  echo "Using manifest file: \${MANIFEST_FILE}"
  
  # Extract plugins from the manifest
  plugins=$(jq -r '.plugins[] | "\\(.name)|\\(.version)|\\(.url)|\\(.checksum // \\"\\")"' "\${MANIFEST_FILE}")
  
  # Download and verify each plugin
  echo "\${plugins}" | while IFS='|' read -r name version url checksum; do
    download_and_verify_plugin "\${name}" "\${version}" "\${url}" "\${checksum}"
  done
else
  echo "Error: Manifest file not found: \${MANIFEST_FILE}"
  exit 1
fi

echo "All plugins downloaded and verified successfully"`;

  // Write the fixed content
  fs.writeFileSync(filePath, fixedContent);
  console.log(`Fixed ${filePath}`);
  
  // Make the script executable
  try {
    execSync(`chmod +x ${filePath}`);
  } catch (error) {
    console.log('Note: Could not make the script executable. You may need to do this manually.');
  }
  
  return true;
}

// Function to fix setup-plugins.js
function fixSetupPluginsScript() {
  console.log('Fixing setup-plugins.js...');
  
  const filePath = filesToFix.setupPlugins;
  if (!fs.existsSync(filePath)) {
    console.error(`Error: ${filePath} not found`);
    return false;
  }
  
  // Read the original file
  const originalContent = fs.readFileSync(filePath, 'utf8');
  
  // Create the fixed content
  const fixedContent = `/**
 * Enhanced setup-plugins.js with checksum verification
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

// Get the manifest file path
const manifestPath = path.join(__dirname, '..', 'app-build-manifest.json');
const pluginsDir = process.argv[2] || path.join(__dirname, '..', 'plugins');

// Create plugins directory if it doesn't exist
if (!fs.existsSync(pluginsDir)) {
  fs.mkdirSync(pluginsDir, { recursive: true });
}

// Function to download a file with promise
function downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(\`Failed to download \${url}: \${response.statusCode}\`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
}

// Function to calculate SHA256 checksum of a file
function calculateChecksum(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    stream.on('error', err => reject(err));
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

// Function to download and verify a plugin
async function downloadAndVerifyPlugin(name, version, url, expectedChecksum) {
  const outputFile = path.join(pluginsDir, \`\${name}-\${version}.tgz\`);
  
  console.log(\`Downloading plugin: \${name} v\${version}\`);
  
  try {
    // Download the plugin
    await downloadFile(url, outputFile);
    
    // Verify checksum if provided
    if (expectedChecksum) {
      console.log(\`Verifying checksum for \${name} v\${version}\`);
      
      const calculatedChecksum = await calculateChecksum(outputFile);
      
      if (calculatedChecksum !== expectedChecksum) {
        console.error(\`Error: Checksum verification failed for \${name} v\${version}\`);
        console.error(\`Expected: \${expectedChecksum}\`);
        console.error(\`Got:      \${calculatedChecksum}\`);
        fs.unlinkSync(outputFile);
        return false;
      }
      
      console.log(\`Checksum verified for \${name} v\${version}\`);
    } else {
      console.warn(\`Warning: No checksum provided for \${name} v\${version}. Skipping verification.\`);
    }
    
    return true;
  } catch (error) {
    console.error(\`Error downloading \${name} v\${version}: \${error.message}\`);
    return false;
  }
}

// Main function
async function main() {
  try {
    // Read and parse the manifest file
    if (!fs.existsSync(manifestPath)) {
      console.error(\`Error: Manifest file not found: \${manifestPath}\`);
      process.exit(1);
    }
    
    console.log(\`Using manifest file: \${manifestPath}\`);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    if (!manifest.plugins || !Array.isArray(manifest.plugins)) {
      console.error('Error: Invalid manifest file format. Expected "plugins" array.');
      process.exit(1);
    }
    
    // Download and verify each plugin
    const results = await Promise.all(
      manifest.plugins.map(plugin => 
        downloadAndVerifyPlugin(plugin.name, plugin.version, plugin.url, plugin.checksum)
      )
    );
    
    // Check if all plugins were downloaded and verified successfully
    if (results.every(result => result)) {
      console.log('All plugins downloaded and verified successfully');
    } else {
      console.error('Some plugins failed to download or verify');
      process.exit(1);
    }
  } catch (error) {
    console.error(\`Error: \${error.message}\`);
    process.exit(1);
  }
}

// Run the main function
main();`;

  // Write the fixed content
  fs.writeFileSync(filePath, fixedContent);
  console.log(`Fixed ${filePath}`);
  
  return true;
}

// Function to create generate-checksum.js utility
function createChecksumUtility() {
  console.log('Creating checksum utility...');
  
  const filePath = path.join(projectRoot, 'plugins', 'headlamp-plugin', 'scripts', 'generate-checksum.js');
  const dirPath = path.dirname(filePath);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
    } catch (error) {
      console.error(`Error creating directory ${dirPath}: ${error.message}`);
      return false;
    }
  }
  
  // Create the utility script
  const content = `#!/usr/bin/env node

/**
 * Generate SHA256 checksum for plugin packages
 */

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
let filePath = null;
let updateManifest = null;
let pluginName = null;
let pluginVersion = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--update-manifest' && i + 1 < args.length) {
    updateManifest = args[++i];
  } else if (args[i] === '--plugin-name' && i + 1 < args.length) {
    pluginName = args[++i];
  } else if (args[i] === '--plugin-version' && i + 1 < args.length) {
    pluginVersion = args[++i];
  } else if (!filePath) {
    filePath = args[i];
  }
}

// Function to calculate SHA256 checksum of a file
function calculateChecksum(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    stream.on('error', err => reject(err));
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

// Function to update manifest file with checksum
function updateManifestFile(manifestPath, pluginName, pluginVersion, checksum) {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    if (!manifest.plugins || !Array.isArray(manifest.plugins)) {
      console.error('Error: Invalid manifest file format. Expected "plugins" array.');
      return false;
    }
    
    let updated = false;
    
    // Find and update the plugin entry
    for (const plugin of manifest.plugins) {
      if (plugin.name === pluginName && plugin.version === pluginVersion) {
        plugin.checksum = checksum;
        updated = true;
        break;
      }
    }
    
    if (!updated) {
      console.error(\`Error: Plugin \${pluginName} v\${pluginVersion} not found in manifest.\`);
      return false;
    }
    
    // Write the updated manifest back to file
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(\`Updated manifest file: \${manifestPath}\`);
    return true;
  } catch (error) {
    console.error(\`Error updating manifest: \${error.message}\`);
    return false;
  }
}

// Main function
async function main() {
  // Check if file path is provided
  if (!filePath) {
    console.error('Error: No file specified.');
    console.log('Usage: node generate-checksum.js [options] <file>');
    process.exit(1);
  }
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.error(\`Error: File not found: \${filePath}\`);
    process.exit(1);
  }
  
  try {
    // Calculate checksum
    const checksum = await calculateChecksum(filePath);
    console.log(\`SHA256 (\${filePath}) = \${checksum}\`);
    
    // Update manifest if requested
    if (updateManifest) {
      if (!pluginName || !pluginVersion) {
        console.error('Error: --plugin-name and --plugin-version are required with --update-manifest');
        process.exit(1);
      }
      
      if (!fs.existsSync(updateManifest)) {
        console.error(\`Error: Manifest file not found: \${updateManifest}\`);
        process.exit(1);
      }
      
      const success = updateManifestFile(updateManifest, pluginName, pluginVersion, checksum);
      if (!success) {
        process.exit(1);
      }
    }
  } catch (error) {
    console.error(\`Error: \${error.message}\`);
    process.exit(1);
  }
}

// Run the main function
main();`;

  // Write the utility script
  fs.writeFileSync(filePath, content);
  console.log(`Created ${filePath}`);
  
  // Make the script executable
  try {
    execSync(`chmod +x ${filePath}`);
  } catch (error) {
    console.log('Note: Could not make the script executable. You may need to do this manually.');
  }
  
  return true;
}

// Main function
function main() {
  console.log('Auto-fixing checksum verification in plugin bundling scripts...');
  
  let success = true;
  
  // Fix fetch-plugins.sh
  if (!fixFetchPluginsScript()) {
    success = false;
  }
  
  // Fix setup-plugins.js
  if (!fixSetupPluginsScript()) {
    success = false;
  }
  
  // Create checksum utility
  if (!createChecksumUtility()) {
    success = false;
  }
  
  if (success) {
    console.log('\nAll files fixed successfully!');
    console.log('\nNext steps:');
    console.log('1. Update your manifest files to include checksums for plugins');
    console.log('2. Use the generate-checksum.js utility to calculate checksums');
    console.log('3. Test the fixed scripts with valid and invalid checksums');
  } else {
    console.error('\nSome files could not be fixed. Please check the errors above.');
  }
}

// Run the main function
main();