// Auto-fix for Jaeger OTLP negative uint32 values
(() => {
  // Original fetch function
  const originalFetch = window.fetch;
  
  // Override fetch to intercept OTLP uploads
  window.fetch = async function(url, options) {
    // Only intercept POST requests to the transform endpoint
    if (options && options.method === 'POST' && url.includes('/api/transform')) {
      try {
        // Get the request body
        const body = options.body;
        if (body) {
          // Parse the JSON body
          const data = JSON.parse(body);
          
          // Fix negative values in unsigned integer fields
          fixNegativeValues(data);
          
          // Replace the request body with fixed data
          options.body = JSON.stringify(data);
        }
      } catch (e) {
        console.warn('Failed to fix OTLP data:', e);
      }
    }
    
    // Call the original fetch with possibly modified options
    return originalFetch.apply(this, arguments);
  };
  
  // Function to fix negative values in unsigned integer fields
  function fixNegativeValues(obj) {
    if (!obj || typeof obj !== 'object') return;
    
    // Fields that should be unsigned integers
    const unsignedFields = [
      'droppedAttributesCount',
      'droppedEventsCount',
      'droppedLinksCount',
      'droppedLabelsCount'
    ];
    
    // Process object properties
    for (const key in obj) {
      const value = obj[key];
      
      // Fix negative values in unsigned integer fields
      if (unsignedFields.includes(key) && typeof value === 'number' && value < 0) {
        obj[key] = 0;
      }
      
      // Recursively process nested objects and arrays
      if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
          value.forEach(item => fixNegativeValues(item));
        } else {
          fixNegativeValues(value);
        }
      }
    }
  }
  
  // Notify that the fix is active
  console.log('OTLP Auto-Fix: Active - Fixing negative values in unsigned integer fields');
})();