// Background Service Worker
importScripts('utils.js');

/**
 * Fetch and analyze external JavaScript files
 */
async function fetchAndAnalyzeScript(url) {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
            }
        });

        if (!response.ok) {
            return { url, error: `HTTP ${response.status}`, content: null };
        }

        const content = await response.text();
        return { url, content, error: null };
    } catch (error) {
        return { url, error: error.message, content: null };
    }
}

/**
 * Test Supabase API connection
 */
async function testSupabaseConnection(supabaseUrl, apiKey) {
    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
            method: 'GET',
            headers: {
                'apikey': apiKey,
                'Authorization': `Bearer ${apiKey}`
            }
        });

        return {
            success: response.ok,
            status: response.status,
            statusText: response.statusText
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Enumerate tables from Supabase
 */
async function enumerateTables(supabaseUrl, apiKey) {
    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
            method: 'GET',
            headers: {
                'apikey': apiKey,
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            return { success: false, error: `HTTP ${response.status}`, tables: [] };
        }

        const data = await response.json();

        // Extract table names from OpenAPI schema
        const tables = [];
        if (data.definitions) {
            tables.push(...Object.keys(data.definitions));
        }
        if (data.paths) {
            Object.keys(data.paths).forEach(path => {
                const tableName = path.replace(/^\//, '').split('/')[0];
                if (tableName && !tables.includes(tableName)) {
                    tables.push(tableName);
                }
            });
        }

        return { success: true, tables: tables.filter(t => t && !t.includes('{')), error: null };
    } catch (error) {
        return { success: false, error: error.message, tables: [] };
    }
}

/**
 * Fetch sample data from a table
 */
async function fetchTableData(supabaseUrl, apiKey, tableName, limit = 20) {
    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}?limit=${limit}`, {
            method: 'GET',
            headers: {
                'apikey': apiKey,
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json'
            }
        });

        if (response.status === 401 || response.status === 403) {
            return {
                success: false,
                blocked: true,
                status: response.status,
                data: null
            };
        }

        if (!response.ok) {
            return {
                success: false,
                blocked: false,
                status: response.status,
                error: `HTTP ${response.status}`,
                data: null
            };
        }

        const data = await response.json();
        return {
            success: true,
            blocked: false,
            data: Array.isArray(data) ? data : [],
            rowCount: Array.isArray(data) ? data.length : 0
        };
    } catch (error) {
        return {
            success: false,
            blocked: false,
            error: error.message,
            data: null
        };
    }
}

/**
 * Perform full security assessment
 */
async function performSecurityAssessment(supabaseUrl, apiKey, progressCallback) {
    const results = {
        supabaseUrl,
        timestamp: new Date().toISOString(),
        connection: null,
        tables: [],
        summary: null,
        errors: []
    };

    // Test connection
    progressCallback({ stage: 'connection', message: 'Testing Supabase connection...' });
    results.connection = await testSupabaseConnection(supabaseUrl, apiKey);

    if (!results.connection.success) {
        results.errors.push('Failed to connect to Supabase API');
        return results;
    }

    // Enumerate tables
    progressCallback({ stage: 'enumeration', message: 'Enumerating database tables...' });
    const enumResult = await enumerateTables(supabaseUrl, apiKey);

    if (!enumResult.success) {
        results.errors.push('Failed to enumerate tables');
        return results;
    }

    const tableNames = enumResult.tables;
    progressCallback({
        stage: 'enumeration',
        message: `Found ${tableNames.length} tables`,
        tableCount: tableNames.length
    });

    // Analyze each table
    for (let i = 0; i < tableNames.length; i++) {
        const tableName = tableNames[i];
        progressCallback({
            stage: 'analysis',
            message: `Analyzing table ${i + 1}/${tableNames.length}: ${tableName}`,
            current: i + 1,
            total: tableNames.length,
            tableName
        });

        // Small delay to avoid rate limiting
        if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        const tableData = await fetchTableData(supabaseUrl, apiKey, tableName);

        if (tableData.blocked) {
            results.tables.push({
                tableName,
                blocked: true,
                status: tableData.status,
                vulnerabilityLevel: 'protected',
                sensitiveFields: [],
                rowCount: 0
            });
        } else if (tableData.success && tableData.data) {
            const analysis = analyzeTable(tableName, tableData.data);
            analysis.blocked = false;
            analysis.status = 200;
            results.tables.push(analysis);
        } else {
            results.tables.push({
                tableName,
                blocked: false,
                error: tableData.error,
                vulnerabilityLevel: 'unknown',
                sensitiveFields: [],
                rowCount: 0
            });
        }
    }

    // Generate summary
    results.summary = generateSummary(results.tables);
    progressCallback({ stage: 'complete', message: 'Scan complete', summary: results.summary });

    return results;
}

/**
 * Handle messages from popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fetchScripts') {
        // Fetch multiple scripts in parallel
        Promise.all(request.urls.map(url => fetchAndAnalyzeScript(url)))
            .then(results => {
                sendResponse({ success: true, data: results });
            })
            .catch(error => {
                sendResponse({ success: false, error: error.message });
            });
        return true; // Keep channel open for async
    }

    if (request.action === 'performAssessment') {
        const { supabaseUrl, apiKey } = request;

        // Create a message port for progress updates
        const port = chrome.runtime.connect({ name: 'assessment-progress' });

        performSecurityAssessment(supabaseUrl, apiKey, (progress) => {
            // Send progress updates back
            chrome.runtime.sendMessage({
                action: 'assessmentProgress',
                progress
            }).catch(() => {
                // Popup might be closed, ignore
            });
        })
        .then(results => {
            sendResponse({ success: true, data: results });
        })
        .catch(error => {
            sendResponse({ success: false, error: error.message });
        });

        return true; // Keep channel open for async
    }

    return false;
});
