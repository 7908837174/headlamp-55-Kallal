#!/usr/bin/env node

/**
 * Test script for checksum verification
 * 
 * This script tests the checksum calculation and verification functions
 * directly without relying on network requests.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// Project root directory
const projectRoot = path.resolve(__dirname, '..');

// Test directories and files
const testDir = path.join(projectRoot, 'test-checksum');
const testPluginDir = path.join(testDir, 'test-plugin');
const testPluginPackage = path.join(testDir, 'test-plugin-1.0.0.tgz');

// Function to create a test plugin package
function createTestPlugin() {
  console.log('Creating test plugin package...');
  
  // Create test directory
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  // Create test plugin directory
  if (!fs.existsSync(testPluginDir)) {
    fs.mkdirSync(testPluginDir, { recursive: true });
  }
  
  // Create package.json
  const packageJson = {
    name: 'test-plugin',
    version: '1.0.0',
    description: 'Test plugin for checksum verification',
    main: 'index.js',
    scripts: {
      test: 'echo "Error: no test specified" && exit 1'
    },
    keywords: [],
    author: '',
    license: 'ISC'
  };
  
  fs.writeFileSync(path.join(testPluginDir, 'package.json'), JSON.stringify(packageJson, null, 2));
  
  // Create index.js
  const indexJs = `console.log('Test plugin loaded');`;
  fs.writeFileSync(path.join(testPluginDir, 'index.js'), indexJs);
  
  // Create the package
  try {
    execSync('npm pack', { cwd: testPluginDir });
    
    // Move the package to the test directory
    const packageFile = path.join(testPluginDir, 'test-plugin-1.0.0.tgz');
    if (fs.existsSync(packageFile)) {
      fs.copyFileSync(packageFile, testPluginPackage);
      fs.unlinkSync(packageFile);
    }
    
    console.log(`Created test plugin package: ${testPluginPackage}`);
  } catch (error) {
    console.error(`Error creating test plugin package: ${error.message}`);
    return false;
  }
  
  return true;
}

// Function to calculate SHA256 checksum of a file
function calculateChecksum(filePath) {
  const fileContent = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileContent).digest('hex');
}

// Function to test checksum calculation
function testChecksumCalculation() {
  console.log('\nTesting checksum calculation...');
  
  try {
    // Calculate checksum using our function
    const checksum = calculateChecksum(testPluginPackage);
    console.log(`Calculated checksum: ${checksum}`);
    
    // Verify the checksum is a valid SHA256 hash
    if (checksum.match(/^[a-f0-9]{64}$/)) {
      console.log('Test passed: Checksum is a valid SHA256 hash.');
      
      // Create a modified copy of the package
      const modifiedPackage = path.join(testDir, 'test-plugin-modified.tgz');
      fs.copyFileSync(testPluginPackage, modifiedPackage);
      
      // Modify the package (append a byte)
      const fd = fs.openSync(modifiedPackage, 'a');
      fs.writeSync(fd, Buffer.from([0x00]));
      fs.closeSync(fd);
      
      // Calculate checksum of the modified package
      const modifiedChecksum = calculateChecksum(modifiedPackage);
      console.log(`Modified package checksum: ${modifiedChecksum}`);
      
      // Verify the checksums are different
      if (checksum !== modifiedChecksum) {
        console.log('Test passed: Checksums are different for modified package.');
        return true;
      } else {
        console.error('Test failed: Checksums are the same for modified package.');
        return false;
      }
    } else {
      console.error('Test failed: Checksum is not a valid SHA256 hash.');
      return false;
    }
  } catch (error) {
    console.error(`Test failed: ${error.message}`);
    return false;
  }
}

// Function to test the generate-checksum.js utility
function testGenerateChecksumUtility() {
  console.log('\nTesting generate-checksum.js utility...');
  
  try {
    // Calculate checksum using our function
    const expectedChecksum = calculateChecksum(testPluginPackage);
    
    // Run the generate-checksum.js utility
    const generateChecksumJs = path.join(projectRoot, 'plugins', 'headlamp-plugin', 'scripts', 'generate-checksum.js');
    const output = execSync(`node ${generateChecksumJs} ${testPluginPackage}`).toString();
    
    // Extract the checksum from the output
    const match = output.match(/SHA256 \([^)]+\) = ([a-f0-9]{64})/);
    if (match && match[1]) {
      const utilityChecksum = match[1];
      console.log(`Utility checksum: ${utilityChecksum}`);
      
      // Verify the checksums match
      if (expectedChecksum === utilityChecksum) {
        console.log('Test passed: Utility checksum matches expected checksum.');
        return true;
      } else {
        console.error('Test failed: Utility checksum does not match expected checksum.');
        return false;
      }
    } else {
      console.error('Test failed: Could not extract checksum from utility output.');
      return false;
    }
  } catch (error) {
    console.error(`Test failed: ${error.message}`);
    return false;
  }
}

// Function to test manifest update
function testManifestUpdate() {
  console.log('\nTesting manifest update...');
  
  try {
    // Create a test manifest
    const testManifest = path.join(testDir, 'test-manifest.json');
    const manifest = {
      plugins: [
        {
          name: 'test-plugin',
          version: '1.0.0',
          url: 'https://example.com/plugins/test-plugin-1.0.0.tgz',
          checksum: 'old-checksum'
        }
      ]
    };
    
    fs.writeFileSync(testManifest, JSON.stringify(manifest, null, 2));
    
    // Calculate checksum
    const expectedChecksum = calculateChecksum(testPluginPackage);
    
    // Run the generate-checksum.js utility with manifest update
    const generateChecksumJs = path.join(projectRoot, 'plugins', 'headlamp-plugin', 'scripts', 'generate-checksum.js');
    execSync(`node ${generateChecksumJs} ${testPluginPackage} --update-manifest ${testManifest} --plugin-name test-plugin --plugin-version 1.0.0`);
    
    // Read the updated manifest
    const updatedManifest = JSON.parse(fs.readFileSync(testManifest, 'utf8'));
    const updatedChecksum = updatedManifest.plugins[0].checksum;
    
    console.log(`Updated checksum in manifest: ${updatedChecksum}`);
    
    // Verify the checksum was updated correctly
    if (expectedChecksum === updatedChecksum) {
      console.log('Test passed: Manifest was updated with correct checksum.');
      return true;
    } else {
      console.error('Test failed: Manifest was not updated with correct checksum.');
      return false;
    }
  } catch (error) {
    console.error(`Test failed: ${error.message}`);
    return false;
  }
}

// Main function
async function main() {
  console.log('Testing checksum verification...');
  
  let success = true;
  
  // Create test plugin package
  if (!createTestPlugin()) {
    success = false;
  }
  
  // Test checksum calculation
  if (!testChecksumCalculation()) {
    success = false;
  }
  
  // Test generate-checksum.js utility
  if (!testGenerateChecksumUtility()) {
    success = false;
  }
  
  // Test manifest update
  if (!testManifestUpdate()) {
    success = false;
  }
  
  if (success) {
    console.log('\nAll tests passed! Checksum verification is working correctly.');
  } else {
    console.error('\nSome tests failed. Please check the errors above.');
  }
}

// Run the main function
main();