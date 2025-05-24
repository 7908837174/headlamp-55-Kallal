/**
 * Jaeger OTLP Trace Fixer
 * 
 * This script intercepts Jaeger's OTLP trace processing to automatically fix
 * negative values in unsigned integer fields.
 */

// Import required modules
const http = require('http');
const https = require('https');
const zlib = require('zlib');

// Fields that should be unsigned integers according to OTLP spec
const UNSIGNED_INT_FIELDS = [
  'droppedAttributesCount',
  'droppedEventsCount',
  'droppedLinksCount',
  'droppedLabelsCount'
];

// Default Jaeger query service port
const DEFAULT_PORT = 16686;
const PROXY_PORT = 8080;

// Fix negative values in unsigned integer fields
function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return;
  
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    
    // Fix negative values in unsigned integer fields
    if (UNSIGNED_INT_FIELDS.includes(key) && typeof value === 'number' && value < 0) {
      console.log(`Fixing negative value in field '${key}': ${value} -> 0`);
      obj[key] = 0;
    }
    
    // Recursively process nested objects and arrays
    if (value && typeof value === 'object') {
      if (Array.isArray(value)) {
        value.forEach(item => sanitizeObject(item));
      } else {
        sanitizeObject(value);
      }
    }
  });
}

// Create proxy server
const server = http.createServer((req, res) => {
  const jaegerHost = process.env.JAEGER_HOST || 'localhost';
  const jaegerPort = parseInt(process.env.JAEGER_PORT || DEFAULT_PORT);
  
  // Only intercept POST requests to the transform endpoint
  if (req.method === 'POST' && req.url.includes('/api/transform')) {
    let body = [];
    
    req.on('data', chunk => {
      body.push(chunk);
    });
    
    req.on('end', () => {
      body = Buffer.concat(body);
      
      // Handle compressed data if needed
      const contentEncoding = req.headers['content-encoding'];
      if (contentEncoding === 'gzip') {
        body = zlib.gunzipSync(body);
      } else if (contentEncoding === 'deflate') {
        body = zlib.inflateSync(body);
      }
      
      try {
        // Parse and sanitize the JSON data
        const data = JSON.parse(body.toString());
        if (Array.isArray(data)) {
          data.forEach(item => sanitizeObject(item));
        } else {
          sanitizeObject(data);
        }
        
        // Convert back to JSON
        const sanitizedBody = JSON.stringify(data);
        
        // Forward the sanitized request to Jaeger
        const options = {
          hostname: jaegerHost,
          port: jaegerPort,
          path: req.url,
          method: req.method,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(sanitizedBody)
          }
        };
        
        // Copy original headers except content-length
        Object.keys(req.headers).forEach(header => {
          if (header !== 'content-length' && header !== 'host') {
            options.headers[header] = req.headers[header];
          }
        });
        
        // Forward the request to Jaeger
        const proxyReq = http.request(options, proxyRes => {
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          proxyRes.pipe(res);
        });
        
        proxyReq.on('error', error => {
          console.error('Error forwarding request to Jaeger:', error);
          res.writeHead(500);
          res.end('Error forwarding request to Jaeger');
        });
        
        proxyReq.write(sanitizedBody);
        proxyReq.end();
        
      } catch (error) {
        console.error('Error processing request:', error);
        res.writeHead(400);
        res.end('Error processing request: ' + error.message);
      }
    });
  } else {
    // For all other requests, forward them directly to Jaeger
    const options = {
      hostname: jaegerHost,
      port: jaegerPort,
      path: req.url,
      method: req.method,
      headers: req.headers
    };
    
    const proxyReq = http.request(options, proxyRes => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    
    proxyReq.on('error', error => {
      console.error('Error forwarding request to Jaeger:', error);
      res.writeHead(500);
      res.end('Error forwarding request to Jaeger');
    });
    
    req.pipe(proxyReq);
  }
});

// Start the server
server.listen(PROXY_PORT, () => {
  console.log(`OTLP Trace Fixer proxy running on port ${PROXY_PORT}`);
  console.log(`Forwarding requests to Jaeger at ${process.env.JAEGER_HOST || 'localhost'}:${process.env.JAEGER_PORT || DEFAULT_PORT}`);
});