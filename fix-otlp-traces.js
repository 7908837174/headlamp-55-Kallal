#!/usr/bin/env node

/**
 * OTLP Trace Sanitizer
 * 
 * This utility fixes OTLP trace files by converting negative values in unsigned integer fields
 * to zero, making them compatible with Jaeger's OTLP parser.
 * 
 * Usage: node fix-otlp-traces.js input.json output.json
 */

const fs = require('fs');

// Fields that should be unsigned integers according to OTLP spec
const UNSIGNED_INT_FIELDS = [
  'droppedAttributesCount',
  'droppedEventsCount',
  'droppedLinksCount',
  'droppedLabelsCount'
];

function sanitizeValue(obj) {
  if (!obj || typeof obj !== 'object') return;
  
  // Process each property in the object
  for (const key in obj) {
    const value = obj[key];
    
    // If the field should be unsigned and has a negative value, set it to 0
    if (UNSIGNED_INT_FIELDS.includes(key) && typeof value === 'number' && value < 0) {
      console.log(`Fixing negative value in field '${key}': ${value} -> 0`);
      obj[key] = 0;
    }
    
    // Recursively process nested objects and arrays
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        value.forEach(item => sanitizeValue(item));
      } else {
        sanitizeValue(value);
      }
    }
  }
}

function processFile(inputPath, outputPath) {
  try {
    // Read the input file
    const data = fs.readFileSync(inputPath, 'utf8');
    
    // Parse JSON content
    let traces;
    try {
      traces = JSON.parse(data);
    } catch (e) {
      // Handle JSONL format (one JSON object per line)
      const lines = data.trim().split('\n');
      traces = lines.map(line => JSON.parse(line));
    }
    
    // Sanitize the traces
    if (Array.isArray(traces)) {
      traces.forEach(trace => sanitizeValue(trace));
    } else {
      sanitizeValue(traces);
    }
    
    // Write the sanitized traces back to the output file
    fs.writeFileSync(outputPath, JSON.stringify(traces, null, 2));
    
    console.log(`Successfully sanitized OTLP traces from ${inputPath} to ${outputPath}`);
  } catch (error) {
    console.error(`Error processing file: ${error.message}`);
    process.exit(1);
  }
}

// Main execution
function main() {
  if (process.argv.length < 4) {
    console.log('Usage: node fix-otlp-traces.js input.json output.json');
    process.exit(1);
  }
  
  const inputPath = process.argv[2];
  const outputPath = process.argv[3];
  
  processFile(inputPath, outputPath);
}

main();