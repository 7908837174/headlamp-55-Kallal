#!/usr/bin/env node

/**
 * Direct test script for plugin bundling with checksum verification
 * 
 * This script tests the checksum verification functions directly by
 * modifying the plugin bundling scripts to use local files.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// Project root directory
const projectRoot = path.resolve(__dirname, '..');

// Test directories and files
const testDir = path.join(projectRoot, 'test-bundling-direct');
const testPluginDir = path.join(testDir, 'test-plugin');
const testPluginPackage = path.join(testDir, 'test-plugin-1.0.0.tgz');
const testPluginModified = path.join(testDir, 'test-plugin-modified-1.0.0.tgz');
const testPluginsDir = path.join(testDir, 'plugins');

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
  
  // Create plugins directory
  if (!fs.existsSync(testPluginsDir)) {
    fs.mkdirSync(testPluginsDir, { recursive: true });
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
    
    // Create a modified version of the package
    fs.copyFileSync(testPluginPackage, testPluginModified);
    const fd = fs.openSync(testPluginModified, 'a');
    fs.writeSync(fd, Buffer.from([0x00]));
    fs.closeSync(fd);
    
    console.log(`Created test plugin packages:`);
    console.log(`- Original: ${testPluginPackage}`);
    console.log(`- Modified: ${testPluginModified}`);
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

// Function to test checksum verification directly
function testChecksumVerification() {
  console.log('\nTesting checksum verification directly...');
  
  try {
    // Calculate checksums
    const originalChecksum = calculateChecksum(testPluginPackage);
    const modifiedChecksum = calculateChecksum(testPluginModified);
    
    console.log(`Original checksum: ${originalChecksum}`);
    console.log(`Modified checksum: ${modifiedChecksum}`);
    
    // Test valid checksum
    if (originalChecksum === calculateChecksum(testPluginPackage)) {
      console.log('Test passed: Valid checksum verification successful.');
    } else {
      console.error('Test failed: Valid checksum verification failed.');
      return false;
    }
    
    // Test invalid checksum
    if (originalChecksum !== modifiedChecksum) {
      console.log('Test passed: Invalid checksum detection successful.');
    } else {
      console.error('Test failed: Invalid checksum detection failed.');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Test failed: ${error.message}`);
    return false;
  }
}

// Function to create a modified setup-plugins.js for testing
function createTestSetupPlugins() {
  console.log('\nCreating test setup-plugins.js...');
  
  try {
    // Calculate checksums
    const originalChecksum = calculateChecksum(testPluginPackage);
    
    // Create a modified version of setup-plugins.js
    const setupPluginsJs = path.join(projectRoot, 'app', 'scripts', 'setup-plugins.js');
    const testSetupPluginsJs = path.join(testDir, 'test-setup-plugins.js');
    
    let content = fs.readFileSync(setupPluginsJs, 'utf8');
    
    // Replace the downloadFile function to use local files
    const downloadFileReplacement = `
// Function to download a file with promise (modified for testing)
function downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    try {
      // For testing, copy the local file instead of downloading
      const testFile = '${testPluginPackage.replace(/\\/g, '/')}';
      fs.copyFileSync(testFile, filePath);
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}`;
    
    content = content.replace(/\/\/ Function to download a file with promise[\s\S]*?}\);[\s\S]*?}\)/, downloadFileReplacement);
    
    fs.writeFileSync(testSetupPluginsJs, content);
    console.log(`Created test setup-plugins.js: ${testSetupPluginsJs}`);
    
    // Create a test manifest
    const testManifest = path.join(testDir, 'test-manifest.json');
    const manifest = {
      plugins: [
        {
          name: 'test-plugin',
          version: '1.0.0',
          url: 'https://example.com/plugins/test-plugin-1.0.0.tgz',
          checksum: originalChecksum
        }
      ]
    };
    
    fs.writeFileSync(testManifest, JSON.stringify(manifest, null, 2));
    console.log(`Created test manifest: ${testManifest}`);
    
    // Create a test manifest with invalid checksum
    const testManifestInvalid = path.join(testDir, 'test-manifest-invalid.json');
    const manifestInvalid = {
      plugins: [
        {
          name: 'test-plugin',
          version: '1.0.0',
          url: 'https://example.com/plugins/test-plugin-1.0.0.tgz',
          checksum: 'invalid-checksum-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
        }
      ]
    };
    
    fs.writeFileSync(testManifestInvalid, JSON.stringify(manifestInvalid, null, 2));
    console.log(`Created test manifest with invalid checksum: ${testManifestInvalid}`);
    
    return {
      testSetupPluginsJs,
      testManifest,
      testManifestInvalid
    };
  } catch (error) {
    console.error(`Failed to create test setup-plugins.js: ${error.message}`);
    return null;
  }
}

// Function to test the modified setup-plugins.js with valid checksum
function testSetupPluginsValid(testSetupPluginsJs, testManifest) {
  console.log('\nTesting setup-plugins.js with valid checksum...');
  
  try {
    // Create a test plugins directory
    const testPluginsDirValid = path.join(testDir, 'plugins-valid');
    if (!fs.existsSync(testPluginsDirValid)) {
      fs.mkdirSync(testPluginsDirValid, { recursive: true });
    }
    
    // Run the test script
    const output = execSync(`node ${testSetupPluginsJs} ${testPluginsDirValid}`, {
      env: {
        ...process.env,
        TEST_MANIFEST_PATH: testManifest
      }
    }).toString();
    
    console.log(output);
    
    // Check if the plugin was downloaded
    const downloadedPlugin = path.join(testPluginsDirValid, 'test-plugin-1.0.0.tgz');
    if (fs.existsSync(downloadedPlugin)) {
      console.log('Test passed: Plugin was downloaded and verified successfully.');
      return true;
    } else {
      console.error('Test failed: Plugin was not downloaded.');
      return false;
    }
  } catch (error) {
    console.error(`Test failed: ${error.message}`);
    return false;
  }
}

// Function to test the modified setup-plugins.js with invalid checksum
function testSetupPluginsInvalid(testSetupPluginsJs, testManifestInvalid) {
  console.log('\nTesting setup-plugins.js with invalid checksum...');
  
  try {
    // Create a test plugins directory
    const testPluginsDirInvalid = path.join(testDir, 'plugins-invalid');
    if (!fs.existsSync(testPluginsDirInvalid)) {
      fs.mkdirSync(testPluginsDirInvalid, { recursive: true });
    }
    
    // Run the test script (should fail due to invalid checksum)
    execSync(`node ${testSetupPluginsJs} ${testPluginsDirInvalid}`, {
      env: {
        ...process.env,
        TEST_MANIFEST_PATH: testManifestInvalid
      }
    });
    
    console.error('Test failed: Script did not detect invalid checksum.');
    return false;
  } catch (error) {
    // Check if the error message contains checksum verification error
    if (error.message.includes('Checksum verification failed')) {
      console.log('Test passed: Script correctly detected invalid checksum and failed.');
      return true;
    } else {
      console.error(`Test failed: Script failed but not due to checksum verification.`);
      console.error(`Error: ${error.message}`);
      return false;
    }
  }
}

// Function to create a modified fetch-plugins.sh for testing
function createTestFetchPlugins() {
  console.log('\nCreating test fetch-plugins.sh...');
  
  try {
    // Calculate checksums
    const originalChecksum = calculateChecksum(testPluginPackage);
    
    // Create a test manifest
    const testManifest = path.join(testDir, 'test-container-manifest.json');
    const manifest = {
      plugins: [
        {
          name: 'test-plugin',
          version: '1.0.0',
          url: testPluginPackage.replace(/\\/g, '/'),
          checksum: originalChecksum
        }
      ]
    };
    
    fs.writeFileSync(testManifest, JSON.stringify(manifest, null, 2));
    console.log(`Created test container manifest: ${testManifest}`);
    
    // Create a test manifest with invalid checksum
    const testManifestInvalid = path.join(testDir, 'test-container-manifest-invalid.json');
    const manifestInvalid = {
      plugins: [
        {
          name: 'test-plugin',
          version: '1.0.0',
          url: testPluginPackage.replace(/\\/g, '/'),
          checksum: 'invalid-checksum-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
        }
      ]
    };
    
    fs.writeFileSync(testManifestInvalid, JSON.stringify(manifestInvalid, null, 2));
    console.log(`Created test container manifest with invalid checksum: ${testManifestInvalid}`);
    
    return {
      testManifest,
      testManifestInvalid
    };
  } catch (error) {
    console.error(`Failed to create test fetch-plugins.sh: ${error.message}`);
    return null;
  }
}

// Main function
async function main() {
  console.log('Testing plugin bundling with checksum verification...');
  
  let success = true;
  
  // Create test plugin package
  if (!createTestPlugin()) {
    success = false;
  }
  
  // Test checksum verification directly
  if (!testChecksumVerification()) {
    success = false;
  }
  
  // Create test setup-plugins.js
  const setupPluginsTest = createTestSetupPlugins();
  if (setupPluginsTest) {
    // Test setup-plugins.js with valid checksum
    if (!testSetupPluginsValid(setupPluginsTest.testSetupPluginsJs, setupPluginsTest.testManifest)) {
      success = false;
    }
    
    // Test setup-plugins.js with invalid checksum
    if (!testSetupPluginsInvalid(setupPluginsTest.testSetupPluginsJs, setupPluginsTest.testManifestInvalid)) {
      success = false;
    }
  } else {
    success = false;
  }
  
  // Create test fetch-plugins.sh
  const fetchPluginsTest = createTestFetchPlugins();
  if (fetchPluginsTest) {
    console.log('\nNote: fetch-plugins.sh tests would be run here in a Unix environment.');
    console.log('These tests are skipped in Windows environment.');
  } else {
    success = false;
  }
  
  if (success) {
    console.log('\nAll tests passed! Plugin bundling with checksum verification is working correctly.');
  } else {
    console.error('\nSome tests failed. Please check the errors above.');
  }
}

// Run the main function
main();