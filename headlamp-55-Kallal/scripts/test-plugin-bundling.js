#!/usr/bin/env node

/**
 * Comprehensive test script for plugin bundling with checksum verification
 * 
 * This script tests the actual plugin bundling scripts to ensure they
 * correctly verify checksums when downloading plugins.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync, spawn } = require('child_process');
const http = require('http');

// Project root directory
const projectRoot = path.resolve(__dirname, '..');

// Test directories and files
const testDir = path.join(projectRoot, 'test-bundling');
const testPluginDir = path.join(testDir, 'test-plugin');
const testPluginPackage = path.join(testDir, 'test-plugin-1.0.0.tgz');
const testPluginModified = path.join(testDir, 'test-plugin-modified-1.0.0.tgz');
const testAppManifest = path.join(testDir, 'app-build-manifest.json');
const testContainerManifest = path.join(testDir, 'build-manifest.json');
const testPluginsDir = path.join(testDir, 'plugins');

// HTTP server for serving test plugins
let server;
let serverPort;

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

// Function to start an HTTP server to serve test plugins
function startServer() {
  return new Promise((resolve, reject) => {
    server = http.createServer((req, res) => {
      console.log(`Server received request: ${req.url}`);
      
      let filePath;
      if (req.url.includes('modified')) {
        filePath = testPluginModified;
      } else {
        filePath = testPluginPackage;
      }
      
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end(JSON.stringify(err));
          return;
        }
        
        res.writeHead(200, {
          'Content-Type': 'application/gzip',
          'Content-Length': data.length
        });
        res.end(data);
      });
    });
    
    server.listen(0, () => {
      serverPort = server.address().port;
      console.log(`Server started on port ${serverPort}`);
      resolve(serverPort);
    });
    
    server.on('error', (err) => {
      reject(err);
    });
  });
}

// Function to stop the HTTP server
function stopServer() {
  return new Promise((resolve, reject) => {
    if (server) {
      server.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Server stopped');
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}

// Function to create test manifest files
function createTestManifests(port) {
  console.log('Creating test manifest files...');
  
  // Calculate checksums
  const originalChecksum = calculateChecksum(testPluginPackage);
  const modifiedChecksum = calculateChecksum(testPluginModified);
  
  console.log(`Original checksum: ${originalChecksum}`);
  console.log(`Modified checksum: ${modifiedChecksum}`);
  
  // Create app manifest with valid checksum
  const appManifest = {
    plugins: [
      {
        name: 'test-plugin',
        version: '1.0.0',
        url: `http://localhost:${port}/test-plugin-1.0.0.tgz`,
        checksum: originalChecksum
      }
    ]
  };
  
  fs.writeFileSync(testAppManifest, JSON.stringify(appManifest, null, 2));
  console.log(`Created app manifest: ${testAppManifest}`);
  
  // Create container manifest with valid checksum
  const containerManifest = {
    plugins: [
      {
        name: 'test-plugin',
        version: '1.0.0',
        url: `http://localhost:${port}/test-plugin-1.0.0.tgz`,
        checksum: originalChecksum
      }
    ]
  };
  
  fs.writeFileSync(testContainerManifest, JSON.stringify(containerManifest, null, 2));
  console.log(`Created container manifest: ${testContainerManifest}`);
  
  // Create app manifest with invalid checksum
  const appManifestInvalid = path.join(testDir, 'app-build-manifest-invalid.json');
  const appManifestInvalidContent = {
    plugins: [
      {
        name: 'test-plugin',
        version: '1.0.0',
        url: `http://localhost:${port}/test-plugin-modified-1.0.0.tgz`,
        checksum: originalChecksum // This is intentionally wrong
      }
    ]
  };
  
  fs.writeFileSync(appManifestInvalid, JSON.stringify(appManifestInvalidContent, null, 2));
  console.log(`Created invalid app manifest: ${appManifestInvalid}`);
  
  return {
    appManifest: testAppManifest,
    containerManifest: testContainerManifest,
    appManifestInvalid: appManifestInvalid,
    originalChecksum,
    modifiedChecksum
  };
}

// Function to test setup-plugins.js with valid checksum
async function testSetupPluginsValid(appManifest) {
  console.log('\nTesting setup-plugins.js with valid checksum...');
  
  const testPluginsDir = path.join(testDir, 'plugins-valid');
  if (!fs.existsSync(testPluginsDir)) {
    fs.mkdirSync(testPluginsDir, { recursive: true });
  }
  
  try {
    // Create a temporary copy of setup-plugins.js for testing
    const setupPluginsJs = path.join(projectRoot, 'app', 'scripts', 'setup-plugins.js');
    const testSetupPluginsJs = path.join(testDir, 'setup-plugins-test.js');
    
    let content = fs.readFileSync(setupPluginsJs, 'utf8');
    
    // Modify the script to use our test manifest
    content = content.replace(
      "const manifestPath = path.join(__dirname, '..', 'app-build-manifest.json');",
      `const manifestPath = '${appManifest.replace(/\\/g, '/')}';`
    );
    
    fs.writeFileSync(testSetupPluginsJs, content);
    
    // Run the test script
    return new Promise((resolve, reject) => {
      const child = spawn('node', [testSetupPluginsJs, testPluginsDir], {
        stdio: 'inherit'
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          // Check if the plugin was downloaded
          const downloadedPlugin = path.join(testPluginsDir, 'test-plugin-1.0.0.tgz');
          if (fs.existsSync(downloadedPlugin)) {
            console.log('Test passed: Plugin was downloaded and verified successfully.');
            resolve(true);
          } else {
            console.error('Test failed: Plugin was not downloaded.');
            resolve(false);
          }
        } else {
          console.error(`Test failed: Process exited with code ${code}`);
          resolve(false);
        }
      });
      
      child.on('error', (err) => {
        console.error(`Test failed: ${err.message}`);
        reject(err);
      });
    });
  } catch (error) {
    console.error(`Test setup failed: ${error.message}`);
    return false;
  }
}

// Function to test setup-plugins.js with invalid checksum
async function testSetupPluginsInvalid(appManifestInvalid) {
  console.log('\nTesting setup-plugins.js with invalid checksum...');
  
  const testPluginsDir = path.join(testDir, 'plugins-invalid');
  if (!fs.existsSync(testPluginsDir)) {
    fs.mkdirSync(testPluginsDir, { recursive: true });
  }
  
  try {
    // Create a temporary copy of setup-plugins.js for testing
    const setupPluginsJs = path.join(projectRoot, 'app', 'scripts', 'setup-plugins.js');
    const testSetupPluginsJs = path.join(testDir, 'setup-plugins-test-invalid.js');
    
    let content = fs.readFileSync(setupPluginsJs, 'utf8');
    
    // Modify the script to use our test manifest
    content = content.replace(
      "const manifestPath = path.join(__dirname, '..', 'app-build-manifest.json');",
      `const manifestPath = '${appManifestInvalid.replace(/\\/g, '/')}';`
    );
    
    fs.writeFileSync(testSetupPluginsJs, content);
    
    // Run the test script (should fail due to invalid checksum)
    return new Promise((resolve, reject) => {
      const child = spawn('node', [testSetupPluginsJs, testPluginsDir]);
      
      let output = '';
      
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        output += data.toString();
      });
      
      child.on('close', (code) => {
        if (code !== 0) {
          // Check if the output contains checksum verification error
          if (output.includes('Checksum verification failed')) {
            console.log('Test passed: Script correctly detected invalid checksum and failed.');
            resolve(true);
          } else {
            console.error('Test failed: Script failed but not due to checksum verification.');
            console.error(`Output: ${output}`);
            resolve(false);
          }
        } else {
          console.error('Test failed: Script did not detect invalid checksum.');
          resolve(false);
        }
      });
      
      child.on('error', (err) => {
        console.error(`Test failed: ${err.message}`);
        reject(err);
      });
    });
  } catch (error) {
    console.error(`Test setup failed: ${error.message}`);
    return false;
  }
}

// Main function
async function main() {
  console.log('Testing plugin bundling with checksum verification...');
  
  let success = true;
  
  try {
    // Create test plugin package
    if (!createTestPlugin()) {
      success = false;
    }
    
    // Start HTTP server
    await startServer();
    
    // Create test manifest files
    const manifests = createTestManifests(serverPort);
    
    // Test setup-plugins.js with valid checksum
    if (!await testSetupPluginsValid(manifests.appManifest)) {
      success = false;
    }
    
    // Test setup-plugins.js with invalid checksum
    if (!await testSetupPluginsInvalid(manifests.appManifestInvalid)) {
      success = false;
    }
    
    // Stop HTTP server
    await stopServer();
    
    if (success) {
      console.log('\nAll tests passed! Plugin bundling with checksum verification is working correctly.');
    } else {
      console.error('\nSome tests failed. Please check the errors above.');
    }
  } catch (error) {
    console.error(`Test failed: ${error.message}`);
    await stopServer();
  }
}

// Run the main function
main();