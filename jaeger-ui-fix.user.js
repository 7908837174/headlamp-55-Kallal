// ==UserScript==
// @name         Jaeger OTLP Auto-Fix
// @namespace    http://jaeger.io/
// @version      1.0
// @description  Automatically fixes negative values in unsigned integer fields in OTLP traces
// @author       You
// @match        *://*/jaeger/*
// @match        *://*/search*
// @match        *://*/trace*
// @match        *://*/dependencies*
// @match        *://*/upload*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
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
    
    // Add a notification to the UI
    function addNotification() {
        const div = document.createElement('div');
        div.style.position = 'fixed';
        div.style.bottom = '10px';
        div.style.right = '10px';
        div.style.backgroundColor = '#4caf50';
        div.style.color = 'white';
        div.style.padding = '8px 16px';
        div.style.borderRadius = '4px';
        div.style.zIndex = '9999';
        div.style.opacity = '0.9';
        div.textContent = 'OTLP Auto-Fix: Active';
        
        // Add to body when it's available
        if (document.body) {
            document.body.appendChild(div);
        } else {
            window.addEventListener('DOMContentLoaded', () => {
                document.body.appendChild(div);
            });
        }
        
        // Fade out after 5 seconds
        setTimeout(() => {
            div.style.transition = 'opacity 1s';
            div.style.opacity = '0';
            setTimeout(() => div.remove(), 1000);
        }, 5000);
    }
    
    // Run notification when page loads
    addNotification();
    console.log('OTLP Auto-Fix: Active - Fixing negative values in unsigned integer fields');
})();