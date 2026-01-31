// Content script - Runs in the context of the active webpage

/**
 * Scan the current page for script sources and inline scripts
 */
function scanPageResources() {
    const resources = {
        scriptUrls: [],
        inlineScripts: [],
        pageUrl: window.location.href,
        domain: window.location.hostname
    };

    // Find all external script tags
    const scriptTags = document.querySelectorAll('script[src]');
    scriptTags.forEach(script => {
        const src = script.src;
        if (src) {
            resources.scriptUrls.push(src);
        }
    });

    // Find all inline scripts
    const inlineScriptTags = document.querySelectorAll('script:not([src])');
    inlineScriptTags.forEach(script => {
        if (script.textContent && script.textContent.trim()) {
            resources.inlineScripts.push(script.textContent);
        }
    });

    // Also check for script content in data attributes or other locations
    const allElements = document.querySelectorAll('*');
    allElements.forEach(element => {
        // Check data attributes
        Array.from(element.attributes).forEach(attr => {
            if (attr.name.startsWith('data-') && attr.value.length > 50) {
                // Check if it might contain config data
                if (attr.value.includes('supabase') || attr.value.includes('eyJ')) {
                    resources.inlineScripts.push(attr.value);
                }
            }
        });
    });

    // Check for Next.js __NEXT_DATA__ script
    const nextDataScript = document.getElementById('__NEXT_DATA__');
    if (nextDataScript) {
        resources.inlineScripts.push(nextDataScript.textContent);
    }

    return resources;
}

/**
 * Listen for messages from popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'scanPage') {
        try {
            const resources = scanPageResources();
            sendResponse({ success: true, data: resources });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }
    return true; // Keep channel open for async response
});
