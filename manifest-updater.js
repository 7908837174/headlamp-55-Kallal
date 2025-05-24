#!/usr/bin/env node

/**
 * Manifest Updater - Adds checksum field to existing manifest files
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

// Paths to manifest files
const manifestFiles = [
  path.join(__dirname, 'headlamp-55-Kallal', 'container', 'build-manifest.json'),
  path.join(__dirname, 'headlamp-55-Kallal', 'app', 'app-build-manifest.json')
];

// Function to download a file
function downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    // Create directory if it doesn't exist
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const file = fs.createWriteStream(filePath);
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Follow redirect
        downloadFile(response.headers.location, filePath)
          .then(resolve)
          .catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
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

// Function to update a manifest file with checksums
async function updateManifest(manifestPath) {
  console.log(`Updating manifest: ${manifestPath}`);
  
  if (!fs.existsSync(manifestPath)) {
    console.log(`Manifest file not found: ${manifestPath}`);
    return false;
  }
  
  try {
    // Read and parse the manifest
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    if (!manifest.plugins || !Array.isArray(manifest.plugins)) {
      console.log(`Invalid manifest format in ${manifestPath}`);
      return false;
    }
    
    // Create temp directory for downloads
    const tempDir = path.join(__dirname, 'temp-downloads');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Process each plugin
    for (const plugin of manifest.plugins) {
      if (!plugin.name || !plugin.version || !plugin.url) {
        console.log(`Skipping invalid plugin entry: ${JSON.stringify(plugin)}`);
        continue;
      }
      
      // Skip if checksum already exists
      if (plugin.checksum) {
        console.log(`Checksum already exists for ${plugin.name} v${plugin.version}`);
        continue;
      }
      
      console.log(`Processing ${plugin.name} v${plugin.version}...`);
      
      try {
        // Download the plugin
        const fileName = `${plugin.name}-${plugin.version}.tgz`;
        const filePath = path.join(tempDir, fileName);
        
        console.log(`Downloading ${plugin.url}...`);
        await downloadFile(plugin.url, filePath);
        
        // Calculate checksum
        console.log(`Calculating checksum...`);
        const checksum = await calculateChecksum(filePath);
        
        // Add checksum to manifest
        plugin.checksum = checksum;
        console.log(`Added checksum for ${plugin.name} v${plugin.version}: ${checksum}`);
        
        // Clean up
        fs.unlinkSync(filePath);
      } catch (error) {
        console.log(`Error processing ${plugin.name} v${plugin.version}: ${error.message}`);
      }
    }
    
    // Write updated manifest back to file
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`Updated ${manifestPath}`);
    
    return true;
  } catch (error) {
    console.log(`Error updating ${manifestPath}: ${error.message}`);
    return false;
  }
}

// Main function
async function main() {
  console.log('Updating manifest files with checksums...');
  
  for (const manifestFile of manifestFiles) {
    await updateManifest(manifestFile);
  }
  
  console.log('Done!');
}

// Run the main function
main().catch(error => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});