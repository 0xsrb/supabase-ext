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
            return { success: false, error: `HTTP ${response.status}`, tables: [], schema: null };
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

        return { 
            success: true, 
            tables: tables.filter(t => t && !t.includes('{')), 
            schema: data,
            error: null 
        };
    } catch (error) {
        return { success: false, error: error.message, tables: [], schema: null };
    }
}

/**
 * Get table schema (columns) from OpenAPI definition
 */
function getTableSchema(schemaData, tableName) {
    const columns = [];
    
    if (!schemaData || !schemaData.definitions) {
        return columns;
    }

    const definition = schemaData.definitions[tableName];
    if (!definition || !definition.properties) {
        return columns;
    }

    // Extract column names and types
    Object.entries(definition.properties).forEach(([columnName, columnDef]) => {
        columns.push({
            name: columnName,
            type: columnDef.type || 'unknown',
            format: columnDef.format || null
        });
    });

    return columns;
}

/**
 * Fetch sample data from a table
 */
async function fetchTableData(supabaseUrl, apiKey, tableName, limit = 5) {
    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}?limit=${limit}`, {
            method: 'GET',
            headers: {
                'apikey': apiKey,
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
                'Prefer': 'count=exact'
            }
        });

        if (response.status === 401 || response.status === 403) {
            return {
                success: false,
                blocked: true,
                status: response.status,
                data: null,
                rowCount: 0
            };
        }

        if (!response.ok) {
            return {
                success: false,
                blocked: false,
                status: response.status,
                error: `HTTP ${response.status}`,
                data: null,
                rowCount: 0
            };
        }

        const data = await response.json();
        
        // Try to get total count from Content-Range header
        const contentRange = response.headers.get('Content-Range');
        let totalCount = 0;
        if (contentRange) {
            const match = contentRange.match(/\/(\d+)$/);
            if (match) {
                totalCount = parseInt(match[1], 10);
            }
        }
        
        return {
            success: true,
            blocked: false,
            data: Array.isArray(data) ? data : [],
            rowCount: totalCount || (Array.isArray(data) ? data.length : 0),
            sampleData: Array.isArray(data) ? data.slice(0, 5) : []
        };
    } catch (error) {
        return {
            success: false,
            blocked: false,
            error: error.message,
            data: null,
            rowCount: 0
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
    const schemaData = enumResult.schema;
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

        const tableData = await fetchTableData(supabaseUrl, apiKey, tableName, 5);
        const tableSchema = getTableSchema(schemaData, tableName);

        if (tableData.blocked) {
            results.tables.push({
                tableName,
                blocked: true,
                status: tableData.status,
                vulnerabilityLevel: 'protected',
                sensitiveFields: [],
                exposedColumns: [],
                columnCount: 0,
                rowCount: 0,
                sampleData: []
            });
        } else if (tableData.success && tableData.data) {
            const analysis = analyzeTable(tableName, tableData.data, tableSchema);
            analysis.blocked = false;
            analysis.status = 200;
            analysis.rowCount = tableData.rowCount;
            analysis.sampleData = tableData.sampleData || [];
            analysis.exposedColumns = tableSchema;
            analysis.columnCount = tableSchema.length;
            results.tables.push(analysis);
        } else {
            results.tables.push({
                tableName,
                blocked: false,
                error: tableData.error,
                vulnerabilityLevel: 'unknown',
                sensitiveFields: [],
                exposedColumns: [],
                columnCount: 0,
                rowCount: 0,
                sampleData: []
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
