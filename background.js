// Background Service Worker
// Version 2.1.0 - Portfolio-Ready Edition
importScripts('utils.js');

// Debug flag - set to false for production
const DEBUG = false;
const log = DEBUG ? console.log.bind(console) : () => {};
const error = console.error.bind(console); // Always log errors

/**
 * Fetch with exponential backoff retry
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} maxRetries - Maximum number of retries
 * @returns {Promise<Object>} Result object with success flag and response/error
 */
async function fetchWithRetry(url, options, maxRetries = 3) {
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            log(`[Retry] Attempt ${attempt + 1}/${maxRetries} for ${url}`);

            const response = await fetch(url, options);

            // Success
            if (response.ok) {
                return { success: true, response };
            }

            // Rate limited - wait longer
            if (response.status === 429) {
                const waitTime = 2000 * Math.pow(2, attempt); // 2s, 4s, 8s
                log(`[Retry] Rate limited, waiting ${waitTime}ms`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
            }

            // Server error - retry
            if (response.status >= 500) {
                lastError = new Error(`HTTP ${response.status}`);
                const waitTime = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
            }

            // Client error (4xx) - don't retry
            return {
                success: false,
                response,
                error: `HTTP ${response.status}`
            };

        } catch (err) {
            lastError = err;
            error(`[Retry] Attempt ${attempt + 1} failed:`, err.message);

            // Don't retry on last attempt
            if (attempt === maxRetries - 1) {
                break;
            }

            // Exponential backoff
            const waitTime = 1000 * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }

    return {
        success: false,
        error: lastError?.message || 'Max retries exceeded'
    };
}

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

        // Extract table names from OpenAPI schema definitions only
        // This is more accurate than parsing paths which can include duplicates
        const tables = [];
        if (data.definitions) {
            // Get all definition keys (these are the actual tables)
            const definitionKeys = Object.keys(data.definitions);
            tables.push(...definitionKeys);
        }

        // Filter out any invalid entries and ensure uniqueness
        const uniqueTables = [...new Set(tables.filter(t => {
            // Remove empty strings, entries with curly braces (path parameters)
            // and any system/internal tables
            return t &&
                !t.includes('{') &&
                !t.includes('}') &&
                t.trim().length > 0;
        }))];

        return {
            success: true,
            tables: uniqueTables,
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
 * Fetch sample data from a table with retry logic
 */
async function fetchTableData(supabaseUrl, apiKey, tableName, limit = 15) {
    const url = `${supabaseUrl}/rest/v1/${tableName}?limit=${limit}`;
    const options = {
        method: 'GET',
        headers: {
            'apikey': apiKey,
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
            'Prefer': 'count=exact'
        }
    };

    const result = await fetchWithRetry(url, options, 3);

    if (!result.success) {
        return {
            success: false,
            blocked: false,
            error: result.error,
            data: null,
            rowCount: 0
        };
    }

    const response = result.response;

    if (response.status === 401 || response.status === 403) {
        return {
            success: false,
            blocked: true,
            status: response.status,
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
            sampleData: Array.isArray(data) ? data.slice(0, 15) : []
        };
    } catch (err) {
        return {
            success: false,
            blocked: false,
            error: err.message,
            data: null,
            rowCount: 0
        };
    }
}

/**
 * Perform full security assessment with parallel processing
 */
async function performSecurityAssessment(supabaseUrl, apiKey, progressCallback) {
    const results = {
        supabaseUrl,
        timestamp: new Date().toISOString(),
        connection: null,
        tables: [],
        summary: null,
        errors: [],
        partialFailures: [] // Track partial failures
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

    // IMPROVED: Analyze tables in parallel batches
    const BATCH_SIZE = 5; // Process 5 tables simultaneously
    const batches = [];

    for (let i = 0; i < tableNames.length; i += BATCH_SIZE) {
        batches.push(tableNames.slice(i, i + BATCH_SIZE));
    }

    log(`[Scanner] Processing ${tableNames.length} tables in ${batches.length} batches`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const batchStartIndex = batchIndex * BATCH_SIZE;

        // Process entire batch in parallel
        const batchPromises = batch.map(async (tableName, batchOffset) => {
            const globalIndex = batchStartIndex + batchOffset;

            progressCallback({
                stage: 'analysis',
                message: `Analyzing table ${globalIndex + 1}/${tableNames.length}: ${tableName}`,
                current: globalIndex + 1,
                total: tableNames.length,
                tableName,
                batchIndex: batchIndex + 1,
                totalBatches: batches.length
            });

            try {
                const tableData = await fetchTableData(supabaseUrl, apiKey, tableName, 15);
                const tableSchema = getTableSchema(schemaData, tableName);

                log(`[Scanner] Table: ${tableName}, Rows: ${tableData.rowCount}, Columns: ${tableSchema.length}`);

                if (tableData.blocked) {
                    return {
                        tableName,
                        blocked: true,
                        status: tableData.status,
                        vulnerabilityLevel: 'protected',
                        sensitiveFields: [],
                        exposedColumns: [],
                        columnCount: 0,
                        rowCount: 0,
                        sampleData: []
                    };
                } else if (tableData.success && tableData.data) {
                    const analysis = analyzeTable(tableName, tableData.data, tableSchema);
                    analysis.blocked = false;
                    analysis.status = 200;
                    analysis.rowCount = tableData.rowCount;
                    return analysis;
                } else {
                    // Track partial failure
                    results.partialFailures.push({
                        tableName,
                        error: tableData.error || 'Unknown error'
                    });

                    return {
                        tableName,
                        blocked: false,
                        error: tableData.error,
                        vulnerabilityLevel: 'unknown',
                        sensitiveFields: [],
                        exposedColumns: [],
                        columnCount: 0,
                        rowCount: 0,
                        sampleData: []
                    };
                }
            } catch (err) {
                error(`[Scanner] Error analyzing ${tableName}:`, err);
                results.partialFailures.push({
                    tableName,
                    error: err.message
                });

                return {
                    tableName,
                    blocked: false,
                    error: err.message,
                    vulnerabilityLevel: 'error',
                    sensitiveFields: [],
                    exposedColumns: [],
                    columnCount: 0,
                    rowCount: 0,
                    sampleData: []
                };
            }
        });

        // Wait for entire batch to complete
        const batchResults = await Promise.all(batchPromises);
        results.tables.push(...batchResults);

        // Small delay between batches to respect rate limits
        if (batchIndex < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }

    // Generate summary
    results.summary = generateSummary(results.tables);
    progressCallback({
        stage: 'complete',
        message: 'Scan complete',
        summary: results.summary,
        partialFailures: results.partialFailures.length
    });

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
