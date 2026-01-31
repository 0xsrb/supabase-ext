// Popup script - Main UI logic

let scanResults = null;
let currentDomain = '';

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
        const url = new URL(tab.url);
        currentDomain = url.hostname;
        document.getElementById('currentDomain').textContent = currentDomain;
    }

    // Initialize Theme
    initTheme();

    // Set up event listeners
    document.getElementById('scanButton').addEventListener('click', startScan);
    document.getElementById('downloadReport').addEventListener('click', downloadReport);
    document.getElementById('downloadCSV').addEventListener('click', downloadCSV);
    document.getElementById('newScan').addEventListener('click', resetToScan);
    document.getElementById('retryButton').addEventListener('click', startScan);
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    // Filter listeners
    document.getElementById('tableSearch').addEventListener('input', applyFilters);
    document.getElementById('vulnerableOnly').addEventListener('change', applyFilters);

    // Listen for progress updates
    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === 'assessmentProgress') {
            updateProgress(message.progress);
        }
    });
});

/**
 * Theme Management
 */
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    // Update icon
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');

    if (theme === 'dark') {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
    } else {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
    }
}

/**
 * Start the security scan
 */
async function startScan() {
    showView('progressView');
    addLog('Starting security scan...');
    updateProgressBar(10);

    try {
        // Step 1: Scan page resources
        addLog('Scanning page for JavaScript resources...');
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        const scanResponse = await chrome.tabs.sendMessage(tab.id, { action: 'scanPage' });

        if (!scanResponse.success) {
            throw new Error('Failed to scan page: ' + scanResponse.error);
        }

        const resources = scanResponse.data;
        addLog(`Found ${resources.scriptUrls.length} external scripts`);
        addLog(`Found ${resources.inlineScripts.length} inline scripts`);
        updateProgressBar(25);

        // Step 2: Extract credentials from page content
        addLog('Analyzing scripts for credentials...');
        const allCredentials = {
            urls: new Set(),
            jwts: new Set()
        };

        // Analyze inline scripts
        resources.inlineScripts.forEach(script => {
            const creds = extractCredentials(script);
            creds.urls.forEach(url => allCredentials.urls.add(url));
            creds.jwts.forEach(jwt => allCredentials.jwts.add(jwt));
        });

        // Fetch and analyze external scripts (limit to first 20 to avoid timeout)
        const scriptsToFetch = resources.scriptUrls.slice(0, 20);
        if (scriptsToFetch.length > 0) {
            addLog(`Fetching ${scriptsToFetch.length} external scripts...`);

            const fetchResponse = await chrome.runtime.sendMessage({
                action: 'fetchScripts',
                urls: scriptsToFetch
            });

            if (fetchResponse.success) {
                fetchResponse.data.forEach(result => {
                    if (result.content) {
                        const creds = extractCredentials(result.content);
                        creds.urls.forEach(url => allCredentials.urls.add(url));
                        creds.jwts.forEach(jwt => allCredentials.jwts.add(jwt));
                    }
                });
            }
        }

        const foundUrls = Array.from(allCredentials.urls);
        const foundJwts = Array.from(allCredentials.jwts);

        addLog(`Found ${foundUrls.length} Supabase URL(s)`);
        addLog(`Found ${foundJwts.length} JWT token(s)`);
        updateProgressBar(40);

        if (foundUrls.length === 0) {
            throw new Error('No Supabase credentials found on this page');
        }

        if (foundJwts.length === 0) {
            throw new Error('Found Supabase URLs but no API keys');
        }

        // Step 3: Test credentials and perform assessment
        const supabaseUrl = foundUrls[0]; // Use first found URL
        const apiKey = foundJwts[0]; // Use first found JWT

        addLog(`Testing connection to ${supabaseUrl}...`);
        addLog('This may take a few minutes...');

        // Perform the security assessment
        const assessmentResponse = await chrome.runtime.sendMessage({
            action: 'performAssessment',
            supabaseUrl,
            apiKey
        });

        if (!assessmentResponse.success) {
            throw new Error('Assessment failed: ' + assessmentResponse.error);
        }

        scanResults = assessmentResponse.data;
        scanResults.discoveredUrls = foundUrls;
        scanResults.discoveredJwts = foundJwts; // Keep full JWTs for copying

        updateProgressBar(100);
        addLog('Scan complete!');

        // Show results after a brief delay
        setTimeout(() => {
            displayResults();
        }, 500);

    } catch (error) {
        console.error('Scan error:', error);
        showError(error.message);
    }
}

/**
 * Update progress from background worker
 */
function updateProgress(progress) {
    if (progress.stage === 'connection') {
        addLog(progress.message);
        updateProgressBar(45);
    } else if (progress.stage === 'enumeration') {
        addLog(progress.message);
        updateProgressBar(50);
    } else if (progress.stage === 'analysis') {
        addLog(progress.message);
        const percent = 50 + Math.floor((progress.current / progress.total) * 45);
        updateProgressBar(percent);
    } else if (progress.stage === 'complete') {
        addLog(progress.message);
        updateProgressBar(100);
    }
}

/**
 * Display scan results
 */
function displayResults() {
    showView('resultsView');

    const summary = scanResults.summary;

    // Update summary card
    if (summary.vulnerableTables > 0) {
        document.getElementById('statusIcon').textContent = '⚠️';
        document.getElementById('statusIcon').className = 'status-icon vulnerable';
        document.getElementById('statusTitle').textContent = 'Vulnerabilities Detected';
        document.getElementById('statusSubtitle').textContent =
            `Found ${summary.vulnerableTables} vulnerable table(s) with exposed sensitive data`;
    } else {
        document.getElementById('statusIcon').textContent = '✓';
        document.getElementById('statusIcon').className = 'status-icon';
        document.getElementById('statusTitle').textContent = 'No Critical Issues';
        document.getElementById('statusSubtitle').textContent =
            'All tables are protected or contain no sensitive data';
    }

    // Update stats
    document.getElementById('statTotalTables').textContent = summary.totalTables;
    document.getElementById('statVulnerable').textContent = summary.vulnerableTables;
    document.getElementById('statBlocked').textContent = summary.blockedTables;

    // Display discovered credentials
    displayCredentials();

    // Display tables by category
    applyFilters();
}

/**
 * Display discovered credentials with Copy buttons
 */
function displayCredentials() {
    const container = document.getElementById('credentialsList');
    container.innerHTML = '';

    // URLs
    scanResults.discoveredUrls.forEach(url => {
        const item = document.createElement('div');
        item.className = 'credential-item';

        const textSpan = document.createElement('span');
        textSpan.innerHTML = `<strong>URL:</strong> ${url}`;

        const copyBtn = createCopyButton(url);

        item.appendChild(textSpan);
        item.appendChild(copyBtn);
        container.appendChild(item);
    });

    // JWTs
    scanResults.discoveredJwts.forEach(jwt => {
        const item = document.createElement('div');
        item.className = 'credential-item';

        const shortJwt = jwt.substring(0, 20) + '...';
        const textSpan = document.createElement('span');
        textSpan.innerHTML = `<strong>JWT:</strong> ${shortJwt}`;
        textSpan.title = jwt; // Tooltip with full JWT

        const copyBtn = createCopyButton(jwt);

        item.appendChild(textSpan);
        item.appendChild(copyBtn);
        container.appendChild(item);
    });
}

function createCopyButton(text) {
    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 4V16C8 17.1046 8.89543 18 10 18H20C21.1046 18 22 17.1046 22 16V4C22 2.89543 21.1046 2 20 2H10C8.89543 2 8 2.89543 8 4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M16 18V20C16 21.1046 15.1046 22 14 22H4C2.89543 22 2 21.1046 2 20V8C2 6.89543 2.89543 6 4 6H6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    `;
    btn.title = "Copy to clipboard";

    btn.addEventListener('click', () => {
        copyToClipboard(text, btn);
    });

    return btn;
}

async function copyToClipboard(text, btn) {
    try {
        await navigator.clipboard.writeText(text);

        // Visual feedback
        const originalHtml = btn.innerHTML;
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        btn.style.color = 'var(--success-text)';

        setTimeout(() => {
            btn.innerHTML = originalHtml;
            btn.style.color = '';
        }, 1500);
    } catch (err) {
        console.error('Failed to copy: ', err);
    }
}

/**
 * Apply filters and render tables
 */
function applyFilters() {
    if (!scanResults || !scanResults.tables) return;

    const searchTerm = document.getElementById('tableSearch').value.toLowerCase();
    const vulnerableOnly = document.getElementById('vulnerableOnly').checked;

    // Filter tables
    const filteredTables = scanResults.tables.filter(table => {
        const matchesSearch = table.tableName.toLowerCase().includes(searchTerm);

        if (vulnerableOnly) {
            return matchesSearch && (table.vulnerabilityLevel === 'critical' || table.vulnerabilityLevel === 'high' || table.vulnerabilityLevel === 'medium');
        }

        return matchesSearch;
    });

    // Group filtered tables
    const vulnerable = [];
    const medium = [];
    const safe = [];
    const blocked = [];

    filteredTables.forEach(table => {
        if (table.blocked) {
            blocked.push(table);
        } else if (table.vulnerabilityLevel === 'critical' || table.vulnerabilityLevel === 'high') {
            vulnerable.push(table);
        } else if (table.vulnerabilityLevel === 'medium') {
            medium.push(table);
        } else {
            safe.push(table);
        }
    });

    // Update counts (based on filtered results)
    document.getElementById('vulnerableCount').textContent = vulnerable.length;
    document.getElementById('mediumCount').textContent = medium.length;
    document.getElementById('protectedCount').textContent = blocked.length;
    document.getElementById('safeCount').textContent = safe.length;

    // Hide/Show sections based on content and filter
    toggleSection('vulnerableTables', vulnerable.length > 0);
    toggleSection('mediumTables', medium.length > 0);
    toggleSection('protectedTables', blocked.length > 0 && !vulnerableOnly); // Hide protected if "Vulnerable Only" is checked
    toggleSection('safeTables', safe.length > 0 && !vulnerableOnly); // Hide safe if "Vulnerable Only" is checked

    // Render lists
    renderTableList('vulnerableTablesList', vulnerable);
    renderTableList('mediumTablesList', medium);
    renderTableList('protectedTablesList', blocked);
    renderTableList('safeTablesList', safe);
}

function toggleSection(id, show) {
    const el = document.getElementById(id);
    if (el) el.style.display = show ? 'block' : 'none';
}

/**
 * Render a list of tables
 */
function renderTableList(containerId, tables) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    tables.forEach(table => {
        const item = document.createElement('div');
        item.className = 'table-item';
        item.dataset.tableName = table.tableName;

        // Determine RLS status badge
        let rlsBadge = '';
        let dataExposedBadge = '';

        if (table.blocked) {
            rlsBadge = '<span class="badge-rls protected">PROTECTED</span>';
        } else if (table.rowCount > 0 || table.columnCount > 0) {
            rlsBadge = '<span class="badge-rls vulnerable">⚠ RLS VULNERABLE</span>';

            // Determine severity
            let severityClass = 'info';
            if (table.vulnerabilityLevel === 'critical') {
                severityClass = 'critical';
            } else if (table.vulnerabilityLevel === 'high') {
                severityClass = 'high';
            } else if (table.vulnerabilityLevel === 'medium') {
                severityClass = 'medium';
            }

            dataExposedBadge = `<span class="badge-severity ${severityClass}">🔓 Data Exposed</span>`;
        } else {
            rlsBadge = '<span class="badge-rls none">NONE</span>';
        }

        // Build sensitive fields badges
        let fieldsHtml = '';
        if (table.sensitiveFields && table.sensitiveFields.length > 0) {
            const badges = table.sensitiveFields.map(field => {
                const severityClass = field.severity === 'critical' ? 'critical' :
                    field.severity === 'high' ? 'high' : 'medium';
                return `<span class="field-badge ${severityClass}">${field.fieldName}</span>`;
            }).join('');
            fieldsHtml = `<div class="table-fields">${badges}</div>`;
        }

        // Create header
        const headerHtml = `
            <div class="table-header" onclick="toggleTableDetails('${table.tableName}')">
                <div class="table-info">
                    <div class="table-title-row">
                        <span class="table-name">${table.tableName}</span>
                        ${rlsBadge}
                        ${dataExposedBadge}
                    </div>
                    <div class="table-meta">
                        <span>${table.columnCount || 0} columns</span>
                        <span class="separator">•</span>
                        <span class="exposed-count">🔓 ${table.rowCount || 0} rows exposed</span>
                    </div>
                </div>
                <div class="expand-icon">▼</div>
            </div>
        `;

        // Create details section (columns + data preview)
        let detailsHtml = '';
        if (!table.blocked && (table.exposedColumns || table.sampleData)) {
            // Exposed columns section
            let columnsHtml = '';
            if (table.exposedColumns && table.exposedColumns.length > 0) {
                const columnBadges = table.exposedColumns.map(col =>
                    `<div class="column-badge">${col.name}</div>`
                ).join('');

                columnsHtml = `
                    <div class="exposed-columns-section">
                        <div class="section-header">
                            <span class="section-icon">📋</span>
                            <strong>Exposed Columns (${table.exposedColumns.length})</strong>
                        </div>
                        <div class="columns-grid">
                            ${columnBadges}
                        </div>
                    </div>
                `;
            }

            // Data preview section
            let dataPreviewHtml = '';
            if (table.sampleData && table.sampleData.length > 0) {
                const columns = Object.keys(table.sampleData[0]);
                const headerRow = columns.map(col => `<th>${col}</th>`).join('');
                const dataRows = table.sampleData.map(row => {
                    const cells = columns.map(col => {
                        let value = row[col];
                        if (value === null) value = '<em>null</em>';
                        else if (value === undefined) value = '<em>undefined</em>';
                        else if (typeof value === 'object') value = JSON.stringify(value);
                        else value = String(value);

                        // Truncate long values
                        if (value.length > 50) {
                            value = value.substring(0, 50) + '...';
                        }

                        return `<td>${value}</td>`;
                    }).join('');
                    return `<tr>${cells}</tr>`;
                }).join('');

                dataPreviewHtml = `
                    <div class="data-preview-section">
                        <div class="section-header">
                            <span class="section-icon">📊</span>
                            <strong>Data Preview (First ${table.sampleData.length} rows)</strong>
                            <button class="copy-curl-btn" onclick="copyCurlCommand('${table.tableName}')" title="Copy as cURL">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M8 4V16C8 17.1046 8.89543 18 10 18H20C21.1046 18 22 17.1046 22 16V4C22 2.89543 21.1046 2 20 2H10C8.89543 2 8 2.89543 8 4Z" stroke="currentColor" stroke-width="2"/>
                                    <path d="M16 18V20C16 21.1046 15.1046 22 14 22H4C2.89543 22 2 21.1046 2 20V8C2 6.89543 2.89543 6 4 6H6" stroke="currentColor" stroke-width="2"/>
                                </svg>
                                Copy as cURL
                            </button>
                        </div>
                        <div class="data-preview-table-container">
                            <table class="data-preview-table">
                                <thead>
                                    <tr>${headerRow}</tr>
                                </thead>
                                <tbody>
                                    ${dataRows}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            }

            detailsHtml = `
                <div class="table-details" id="details-${table.tableName}">
                    ${columnsHtml}
                    ${dataPreviewHtml}
                </div>
            `;
        }

        item.innerHTML = headerHtml + fieldsHtml + detailsHtml;
        container.appendChild(item);
    });
}

/**
 * Download report as JSON
 */
function downloadReport() {
    const report = {
        scanDate: new Date().toISOString(),
        domain: currentDomain,
        supabaseUrl: scanResults.supabaseUrl,
        summary: scanResults.summary,
        tables: scanResults.tables
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supabase-scan-${currentDomain}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Download report as CSV
 */
function downloadCSV() {
    if (!scanResults || !scanResults.tables) return;

    // Flatten data for CSV
    // Format: Table Name, Status, Vulnerability Level, Row Count, Sensitive Fields
    const headers = ['Table Name', 'Status', 'Vulnerability Level', 'Row Count', 'Sensitive Fields'];
    const rows = scanResults.tables.map(table => {
        const status = table.blocked ? 'Blocked' : 'Accessible';
        const level = table.vulnerabilityLevel;
        const count = table.rowCount;
        const fields = table.sensitiveFields ? table.sensitiveFields.map(f => f.fieldName).join(', ') : '';

        // Escape quotes for CSV
        return [
            `"${table.tableName}"`,
            `"${status}"`,
            `"${level}"`,
            count,
            `"${fields}"`
        ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supabase-scan-${currentDomain}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Reset to scan view
 */
function resetToScan() {
    scanResults = null;
    document.getElementById('logOutput').innerHTML = '';
    updateProgressBar(0);
    // Clear search
    document.getElementById('tableSearch').value = '';
    document.getElementById('vulnerableOnly').checked = false;

    showView('scanView');
}

/**
 * Show error view
 */
function showError(message) {
    document.getElementById('errorMessage').textContent = message;
    showView('errorView');
}

/**
 * Show a specific view
 */
function showView(viewId) {
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(viewId).classList.add('active');
}

/**
 * Add log entry
 */
function addLog(message) {
    const logOutput = document.getElementById('logOutput');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    const timestamp = new Date().toLocaleTimeString();
    entry.textContent = `[${timestamp}] ${message}`;
    logOutput.appendChild(entry);
    logOutput.scrollTop = logOutput.scrollHeight;
}

/**
 * Toggle table details expansion
 */
function toggleTableDetails(tableName) {
    const details = document.getElementById(`details-${tableName}`);
    const tableItem = details?.closest('.table-item');

    if (!details || !tableItem) return;

    const isExpanded = details.classList.contains('expanded');
    const expandIcon = tableItem.querySelector('.expand-icon');

    if (isExpanded) {
        details.classList.remove('expanded');
        if (expandIcon) expandIcon.textContent = '▼';
    } else {
        details.classList.add('expanded');
        if (expandIcon) expandIcon.textContent = '▲';
    }
}

/**
 * Copy cURL command for a table
 */
function copyCurlCommand(tableName) {
    if (!scanResults) return;

    const curlCommand = generateCurlCommand(
        scanResults.supabaseUrl,
        scanResults.discoveredJwts[0],
        tableName
    );

    navigator.clipboard.writeText(curlCommand).then(() => {
        // Visual feedback - find the button that was clicked
        const buttons = document.querySelectorAll('.copy-curl-btn');
        buttons.forEach(btn => {
            if (btn.onclick && btn.onclick.toString().includes(tableName)) {
                const originalText = btn.innerHTML;
                btn.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Copied!
                `;
                btn.style.background = 'var(--success-bg, #10b981)';

                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.style.background = '';
                }, 2000);
            }
        });
    }).catch(err => {
        console.error('Failed to copy cURL command:', err);
    });
}

/**
 * Update progress bar
 */
function updateProgressBar(percent) {
    document.getElementById('progressFill').style.width = percent + '%';
}