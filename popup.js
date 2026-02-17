// Popup script - Main UI logic
// Version 2.1.0 - Portfolio-Ready Edition

// Debug flag - set to false for production
const DEBUG = false;
const log = DEBUG ? console.log.bind(console) : () => {};
const error = console.error.bind(console); // Always log errors

let scanResults = null;
let currentDomain = '';
let scanCancelled = false;
let scanStartTime = null;

/**
 * Debounce utility function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

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
    document.getElementById('downloadPDF').addEventListener('click', downloadPDF);
    document.getElementById('downloadMigration').addEventListener('click', downloadMigrationSQL);
    document.getElementById('newScan').addEventListener('click', resetToScan);
    document.getElementById('retryButton').addEventListener('click', startScan);
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('cancelScan').addEventListener('click', cancelScan);

    // Set up collapsible sections
    setupCollapsibleSections();

    // Filter listeners - with debounce for better performance
    document.getElementById('tableSearch').addEventListener('input', debounce(applyFilters, 300));
    document.getElementById('vulnerableOnly').addEventListener('change', applyFilters);

    // Keyboard shortcuts
    setupKeyboardShortcuts();

    // Listen for progress updates
    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === 'assessmentProgress') {
            updateProgress(message.progress);
        }
    });
});

/**
 * Setup keyboard shortcuts for power users
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + S - Start scan
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            const scanView = document.getElementById('scanView');
            if (scanView.classList.contains('active')) {
                startScan();
            }
        }

        // Ctrl/Cmd + E - Export JSON
        if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
            e.preventDefault();
            const resultsView = document.getElementById('resultsView');
            if (resultsView.classList.contains('active') && scanResults) {
                downloadReport();
            }
        }

        // Ctrl/Cmd + F - Focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            const searchInput = document.getElementById('tableSearch');
            if (searchInput && searchInput.offsetParent !== null) {
                searchInput.focus();
                searchInput.select();
            }
        }

        // Escape - Close expanded tables
        if (e.key === 'Escape') {
            document.querySelectorAll('.table-details.expanded').forEach(details => {
                details.classList.remove('expanded');
            });
            document.querySelectorAll('.expand-icon').forEach(icon => {
                icon.textContent = '▼';
            });
        }
    });
}

/**
 * Theme Management
 */
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
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
    scanCancelled = false;
    scanStartTime = Date.now(); // Track start time for ETA calculation
    showView('progressView');

    // Reset progress stages
    resetProgressStages();
    updateStage('credentials', 'active');

    // Show loading skeleton
    showLoadingSkeleton();

    // Show "Scanning in progress" message
    const progressText = document.getElementById('progressText');
    progressText.textContent = '🔍 Scanning in progress...';
    progressText.classList.add('scanning');

    addLog('Starting security scan...');
    updateProgressBar(10);

    try {
        if (scanCancelled) throw new Error('Scan cancelled by user');

        // Step 1: Scan page resources
        addLog('Scanning page for JavaScript resources...');
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // Check if we're on a restricted page
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
            throw new Error('Cannot scan browser internal pages. Please navigate to a regular website.');
        }

        // Try to send message to content script
        let scanResponse = await chrome.tabs.sendMessage(tab.id, { action: 'scanPage' }).catch(async (err) => {
            // Content script not loaded - inject it manually
            addLog('Injecting content script...');
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content_script.js']
                });

                // Wait a bit for script to initialize
                await new Promise(resolve => setTimeout(resolve, 100));

                // Try again
                return await chrome.tabs.sendMessage(tab.id, { action: 'scanPage' });
            } catch (injectError) {
                return { success: false, error: 'Failed to inject content script: ' + injectError.message };
            }
        });

        if (!scanResponse || !scanResponse.success) {
            throw new Error('Failed to scan page: ' + (scanResponse?.error || 'Unknown error'));
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
        updateStage('credentials', 'completed');

        if (scanCancelled) throw new Error('Scan cancelled by user');

        if (foundUrls.length === 0) {
            throw new Error('No Supabase credentials found on this page');
        }

        if (foundJwts.length === 0) {
            throw new Error('Found Supabase URLs but no API keys');
        }

        // Step 3: Test credentials and perform assessment
        updateStage('testing', 'active');
        const supabaseUrl = foundUrls[0]; // Use first found URL
        const apiKey = foundJwts[0]; // Use first found JWT

        addLog(`Testing connection to ${supabaseUrl}...`);
        addLog('This may take a few minutes...');

        if (scanCancelled) throw new Error('Scan cancelled by user');

        // Perform the security assessment
        const assessmentResponse = await chrome.runtime.sendMessage({
            action: 'performAssessment',
            supabaseUrl,
            apiKey
        });

        if (!assessmentResponse.success) {
            throw new Error('Assessment failed: ' + assessmentResponse.error);
        }

        updateStage('testing', 'completed');
        updateStage('enumeration', 'completed');
        updateStage('analysis', 'completed');

        scanResults = assessmentResponse.data;
        scanResults.discoveredUrls = foundUrls;
        scanResults.discoveredJwts = foundJwts; // Keep full JWTs for copying

        updateProgressBar(100);
        addLog('Scan complete!');

        // Update progress text
        progressText.textContent = '✅ Scan complete! Preparing results...';
        progressText.classList.remove('scanning');

        // Show results after a brief delay
        setTimeout(() => {
            displayResults();
        }, 500);

    } catch (err) {
        error('Scan error:', err);
        const progressText = document.getElementById('progressText');
        progressText.classList.remove('scanning');

        // Enhanced error messages with troubleshooting guidance
        let userMessage = 'Scan failed';
        let details = null;

        if (err.message.includes('No Supabase credentials')) {
            userMessage = 'No Supabase credentials found on this page';
            details = 'Make sure:\n• The page uses Supabase\n• The page has fully loaded\n• JavaScript is enabled';
        } else if (err.message.includes('API keys')) {
            userMessage = 'Found Supabase URL but no API key';
            details = 'The page may be using server-side authentication.\nTry scanning a different page or check the Network tab.';
        } else if (err.message.includes('Assessment failed')) {
            userMessage = 'Failed to connect to Supabase API';
            details = `Error: ${err.message}\n\nPossible causes:\n• Invalid API key\n• Network connectivity issues\n• CORS restrictions`;
        } else if (err.message.includes('cancelled')) {
            userMessage = 'Scan cancelled by user';
            details = null;
        } else {
            userMessage = 'An unexpected error occurred';
            details = err.message;
        }

        showError(userMessage, details);
    }
}

/**
 * Update progress from background worker with enhanced feedback
 */
function updateProgress(progress) {
    const progressText = document.getElementById('progressText');

    if (progress.stage === 'connection') {
        addLog(progress.message);
        updateProgressBar(45);
        progressText.textContent = '🔍 Testing connection...';
    } else if (progress.stage === 'enumeration') {
        addLog(progress.message);
        updateProgressBar(50);
        progressText.textContent = `📋 Found ${progress.tableCount || 0} tables`;
    } else if (progress.stage === 'analysis') {
        const percentage = Math.round((progress.current / progress.total) * 100);
        const batchInfo = progress.batchIndex ? ` [Batch ${progress.batchIndex}/${progress.totalBatches}]` : '';

        addLog(`${progress.message}${batchInfo}`);

        // Calculate ETA if we have enough data
        let etaText = '';
        if (progress.current > 0 && scanStartTime) {
            const elapsed = Date.now() - scanStartTime;
            const avgTimePerTable = elapsed / progress.current;
            const remaining = (progress.total - progress.current) * avgTimePerTable;
            const etaSeconds = Math.ceil(remaining / 1000);
            etaText = ` - ETA: ${etaSeconds}s`;
        }

        progressText.textContent = `🔍 Analyzing: ${progress.current}/${progress.total} (${percentage}%)${etaText}`;

        const percent = 50 + Math.floor((progress.current / progress.total) * 45);
        updateProgressBar(percent);
    } else if (progress.stage === 'complete') {
        addLog(progress.message);
        if (progress.partialFailures > 0) {
            addLog(`⚠️ ${progress.partialFailures} table(s) failed to scan`);
            progressText.textContent = `✅ Scan complete (${progress.partialFailures} warnings)`;
        } else {
            progressText.textContent = '✅ Scan complete!';
        }
        updateProgressBar(100);
    }
}

/**
 * Display scan results
 */
function displayResults() {
    showView('resultsView');

    const summary = scanResults.summary;

    // Calculate risk score
    const riskScore = calculateRiskScore(scanResults.tables);
    const riskInfo = getRiskLevel(riskScore);

    // Generate critical findings
    const criticalFindings = generateCriticalFindings(scanResults.tables);

    // Update risk score display
    const riskScoreEl = document.getElementById('riskScore');
    const riskLevelEl = document.getElementById('riskLevel');
    if (riskScoreEl && riskLevelEl) {
        riskScoreEl.textContent = riskScore;
        riskLevelEl.textContent = riskInfo.level;
        riskLevelEl.className = `risk-level ${riskInfo.color}`;

        // Animate the score
        animateCounter(riskScoreEl, 0, riskScore, 1000);
    }

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

    // Update enhanced stats
    document.getElementById('statTotalTables').textContent = summary.totalTables;
    document.getElementById('statVulnerable').textContent = summary.vulnerableTables;
    document.getElementById('statBlocked').textContent = summary.blockedTables;

    // Add new stats
    const totalExposedRows = summary.totalExposedRows || 0;
    const totalExposedColumns = scanResults.tables
        .filter(t => !t.blocked)
        .reduce((sum, t) => sum + (t.columnCount || 0), 0);

    document.getElementById('statExposedRows').textContent = totalExposedRows;
    document.getElementById('statExposedColumns').textContent = totalExposedColumns;

    // Display critical findings
    displayCriticalFindings(criticalFindings);

    // Display discovered credentials
    displayCredentials();

    // Add section badges
    updateSectionBadges(criticalFindings);

    // Display tables by category
    applyFilters();
}

/**
 * Update section header badges with counts
 */
function updateSectionBadges(criticalFindings) {
    // Critical findings badge
    const criticalHeader = document.querySelector('#criticalFindingsSection h3');
    if (criticalHeader) {
        const existingBadge = criticalHeader.querySelector('.section-badge');
        if (existingBadge) existingBadge.remove();

        const badge = document.createElement('span');
        badge.className = `section-badge ${criticalFindings.length === 0 ? 'zero' : ''}`;
        badge.textContent = criticalFindings.length;
        criticalHeader.appendChild(badge);
    }

    // Credentials badge
    const credentialsHeader = document.querySelector('#credentialsSection h3');
    if (credentialsHeader && scanResults) {
        const existingBadge = credentialsHeader.querySelector('.section-badge');
        if (existingBadge) existingBadge.remove();

        const credCount = (scanResults.discoveredUrls?.length || 0) + (scanResults.discoveredJwts?.length || 0);
        const badge = document.createElement('span');
        badge.className = 'section-badge';
        badge.textContent = credCount;
        credentialsHeader.appendChild(badge);
    }

    // Tables badge
    const tablesHeader = document.querySelector('#tablesSection h3');
    if (tablesHeader && scanResults) {
        const existingBadge = tablesHeader.querySelector('.section-badge');
        if (existingBadge) existingBadge.remove();

        const badge = document.createElement('span');
        badge.className = 'section-badge';
        badge.textContent = scanResults.tables?.length || 0;
        tablesHeader.appendChild(badge);
    }
}

/**
 * Display critical findings section with enhanced empty state
 */
function displayCriticalFindings(findings) {
    const container = document.getElementById('criticalFindingsList');
    if (!container) return;

    if (findings.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🎉</div>
                <div class="empty-state-title">No Critical Vulnerabilities Found!</div>
                <div class="empty-state-description">
                    All tables are either protected by RLS or contain no sensitive data.
                </div>
            </div>
        `;
        return;
    }

    // Display all findings in a single line with separators
    const findingsHtml = findings.map((finding, index) => {
        const icon = finding.severity === 'critical' ? '🚨' :
            finding.severity === 'high' ? '⚠️' : '⚡';
        return `<span class="finding-inline ${finding.severity}">${icon} ${index + 1}. <strong>${finding.table}</strong>: ${finding.message}</span>`;
    }).join(' <span class="finding-separator">•</span> ');

    container.innerHTML = `<div class="findings-inline-container">${findingsHtml}</div>`;
}

/**
 * Animate counter from start to end
 */
function animateCounter(element, start, end, duration) {
    const startTime = performance.now();
    const range = end - start;

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const current = Math.round(start + range * easeOutQuart);

        element.textContent = current;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
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

        // Add tooltip and copy button
        const vulnerabilityTooltip = `
            <span class="tooltip">ℹ️
                <span class="tooltiptext">${getVulnerabilityExplanation(table)}</span>
            </span>
        `;

        const copyTableBtn = `<button class="copy-table-name" onclick="copyText('${escapeHtml(table.tableName)}', this)">Copy Name</button>`;

        // Create header with data attribute instead of inline onclick
        const headerHtml = `
            <div class="table-header" data-table-name="${escapeHtml(table.tableName)}">
                <div class="table-info">
                    <div class="table-title-row">
                        <span class="table-name">${table.tableName}</span>
                        ${copyTableBtn}
                        ${vulnerabilityTooltip}
                        ${rlsBadge}
                        ${dataExposedBadge}
                        <span class="table-meta-inline" style="margin-left: 12px; color: var(--text-secondary); font-size: 12px;">${table.columnCount || 0} columns • 🔓 ${table.rowCount || 0} rows exposed</span>
                    </div>
                </div>
                <div class="expand-icon">▼</div>
            </div>
        `;

        // Create details section (columns + data preview + RLS policy)
        let detailsHtml = '';
        if (!table.blocked && (table.exposedColumns || table.sampleData)) {
            // RLS Policy Section (only for vulnerable tables)
            let rlsPolicyHtml = '';
            if (table.vulnerabilityLevel && table.vulnerabilityLevel !== 'low') {
                const policy = generateRLSPolicy(table.tableName, table.vulnerabilityLevel);
                const remediation = getRemediationSteps(table.vulnerabilityLevel);

                rlsPolicyHtml = `
                    <div class="rls-policy-section">
                        <div class="rls-policy-header">
                            <span class="rls-policy-title">🛡️ Suggested RLS Policy</span>
                            <button class="copy-policy-btn" onclick="copyText(\`${policy.replace(/`/g, '\\`')}\`, this)">Copy SQL</button>
                        </div>
                        <div class="rls-policy-code">${escapeHtml(policy)}</div>
                        <div class="remediation-steps">
                            <h4>📋 Remediation Steps:</h4>
                            <ol>
                                ${remediation.map(step => `<li>${step}</li>`).join('')}
                            </ol>
                        </div>
                    </div>
                `;
            }

            // Exposed columns section
            let columnsHtml = '';
            if (table.exposedColumns && table.exposedColumns.length > 0) {
                const columnBadges = table.exposedColumns.map(col => {
                    const typeIcon = getColumnTypeIcon(col.type || col.format);
                    const isSensitive = isSensitiveField(col.name);
                    const sensitiveClass = isSensitive ? 'sensitive' : '';
                    const sensitiveIndicator = isSensitive ? ' ⚠️' : '';

                    return `<div class="column-badge ${sensitiveClass}">
                        <span class="column-icon">${typeIcon}</span>
                        <span class="column-name">${col.name}</span>${sensitiveIndicator}
                    </div>`;
                }).join('');

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
                console.log(`[Popup] Rendering data preview for ${table.tableName}:`, table.sampleData.length, 'rows');

                const columns = Object.keys(table.sampleData[0]);

                const headerRow = columns.map(col => {
                    return `<th>${col}</th>`;
                }).join('');

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
            } else {
                console.log(`[Popup] No sample data for ${table.tableName}`);
            }

            detailsHtml = `
                <div class="table-details">
                    ${rlsPolicyHtml}
                    ${columnsHtml}
                    ${dataPreviewHtml}
                </div>
            `;
        }

        item.innerHTML = headerHtml + fieldsHtml + detailsHtml;
        
        // Add click event listener to the header after it's added to DOM
        const header = item.querySelector('.table-header');
        if (header) {
            header.addEventListener('click', function() {
                const tableName = this.getAttribute('data-table-name');
                toggleTableDetails(tableName);
            });
        }
        
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
 * Download automated RLS migration SQL
 */
function downloadMigrationSQL() {
    if (!scanResults || !scanResults.tables) return;

    const migration = generateBulkMigration(scanResults.tables);

    const blob = new Blob([migration], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supabase-rls-migration-${currentDomain}-${Date.now()}.sql`;
    a.click();
    URL.revokeObjectURL(url);

    // Show success message
    log('✅ Migration SQL downloaded successfully');
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
 * Show error view with enhanced details
 * @param {string} message - Main error message
 * @param {string} details - Optional detailed troubleshooting information
 */
function showError(message, details = null) {
    document.getElementById('errorMessage').textContent = message;

    // Add details section if provided
    const errorView = document.getElementById('errorView');
    let detailsEl = errorView.querySelector('.error-details');

    if (details) {
        if (!detailsEl) {
            detailsEl = document.createElement('div');
            detailsEl.className = 'error-details';
            const container = errorView.querySelector('.error-container');
            const retryButton = document.getElementById('retryButton');
            container.insertBefore(detailsEl, retryButton);
        }
        detailsEl.innerHTML = `<pre>${details}</pre>`;
        detailsEl.style.display = 'block';
    } else if (detailsEl) {
        detailsEl.style.display = 'none';
    }

    showView('errorView');
}

/**
 * Show a specific view with smooth transition
 */
function showView(viewId) {
    // Remove active from all views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });

    // Use requestAnimationFrame to ensure smooth transition
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            document.getElementById(viewId).classList.add('active');
        });
    });
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
 * Escape HTML to prevent issues with special characters
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Toggle table details expansion
 */
function toggleTableDetails(tableName) {
    console.log('[Toggle] Attempting to toggle:', tableName);

    // Use CSS selector to find the details element
    const allTableItems = document.querySelectorAll('.table-item');
    let targetDetails = null;
    let targetTableItem = null;

    // Find the table item that matches this table name
    for (const item of allTableItems) {
        const header = item.querySelector('.table-header');
        if (header && header.getAttribute('data-table-name') === tableName) {
            targetDetails = item.querySelector('.table-details');
            targetTableItem = item;
            break;
        }
    }

    console.log('[Toggle] Details element:', targetDetails);

    if (!targetDetails) {
        console.error('[Toggle] Details element not found for:', tableName);
        return;
    }

    const isExpanded = targetDetails.classList.contains('expanded');
    const expandIcon = targetTableItem.querySelector('.expand-icon');

    console.log('[Toggle] Is expanded:', isExpanded);

    if (isExpanded) {
        targetDetails.classList.remove('expanded');
        if (expandIcon) expandIcon.textContent = '▼';
        console.log('[Toggle] Collapsed');
    } else {
        targetDetails.classList.add('expanded');
        if (expandIcon) expandIcon.textContent = '▲';
        console.log('[Toggle] Expanded');
    }
}

// Make function globally accessible
window.toggleTableDetails = toggleTableDetails;

/**
 * Update progress bar
 */
function updateProgressBar(percent) {
    document.getElementById('progressFill').style.width = percent + '%';
}

/**
 * Update progress stage
 */
function updateStage(stageName, status) {
    const stage = document.getElementById(`stage-${stageName}`);
    if (!stage) return;

    stage.classList.remove('active', 'completed');

    if (status === 'active') {
        stage.classList.add('active');
        const icon = stage.querySelector('.stage-icon');
        icon.textContent = '⏳';
    } else if (status === 'completed') {
        stage.classList.add('completed');
        const icon = stage.querySelector('.stage-icon');
        icon.textContent = '✓';
    }
}

/**
 * Reset progress stages
 */
function resetProgressStages() {
    const stages = ['credentials', 'testing', 'enumeration', 'analysis'];
    stages.forEach(stageName => {
        const stage = document.getElementById(`stage-${stageName}`);
        if (stage) {
            stage.classList.remove('active', 'completed');
            const icon = stage.querySelector('.stage-icon');
            icon.textContent = '⏳';
        }
    });
}

/**
 * Cancel scan
 */
function cancelScan() {
    scanCancelled = true;
    addLog('Cancelling scan...');
    showError('Scan cancelled by user');
}

/**
 * Show loading skeleton while scan initializes
 */
function showLoadingSkeleton() {
    const logOutput = document.getElementById('logOutput');
    logOutput.innerHTML = `
        <div class="skeleton skeleton-text" style="width: 80%"></div>
        <div class="skeleton skeleton-text" style="width: 60%"></div>
        <div class="skeleton skeleton-text" style="width: 90%"></div>
        <div class="skeleton skeleton-text" style="width: 70%"></div>
    `;
}

/**
 * Setup collapsible sections
 */
function setupCollapsibleSections() {
    document.querySelectorAll('.section-toggle').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const section = this.closest('.collapsible-section');
            section.classList.toggle('collapsed');
        });
    });
}

/**
 * Generate RLS policy for a table
 */
function generateRLSPolicy(tableName, vulnerabilityLevel) {
    const policies = {
        critical: `-- Enable RLS on ${tableName}
ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;

-- Create policy to restrict access to authenticated users only
CREATE POLICY "Authenticated users only"
ON ${tableName}
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Optionally, create policy for user-specific data
-- Uncomment if table has a user_id column
/*
CREATE POLICY "Users can only access own data"
ON ${tableName}
FOR ALL
TO authenticated
USING (user_id = auth.uid());
*/`,
        high: `-- Enable RLS on ${tableName}
ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;

-- Create policy with specific conditions
CREATE POLICY "Restrict access policy"
ON ${tableName}
FOR SELECT
TO authenticated
USING (
    -- Add your access conditions here
    auth.uid() IS NOT NULL
);`,
        medium: `-- Enable RLS on ${tableName}
ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;

-- Create read-only policy for authenticated users
CREATE POLICY "Read access for authenticated users"
ON ${tableName}
FOR SELECT
TO authenticated
USING (true);`
    };

    return policies[vulnerabilityLevel] || policies.high;
}

/**
 * Get remediation steps
 */
function getRemediationSteps(vulnerabilityLevel) {
    const steps = {
        critical: [
            'Enable Row Level Security (RLS) immediately',
            'Review all data that has been exposed',
            'Create appropriate RLS policies based on your access requirements',
            'Test policies thoroughly before deploying to production',
            'Audit who may have accessed this data',
            'Consider rotating sensitive credentials if exposed'
        ],
        high: [
            'Enable Row Level Security (RLS) as soon as possible',
            'Create RLS policies appropriate for your use case',
            'Verify policies work as expected',
            'Monitor access logs for unusual activity'
        ],
        medium: [
            'Review data sensitivity and access requirements',
            'Consider enabling RLS if data should be restricted',
            'Implement appropriate access controls',
            'Document intentional public access'
        ]
    };

    return steps[vulnerabilityLevel] || steps.high;
}

/**
 * Get vulnerability explanation
 */
function getVulnerabilityExplanation(table) {
    if (table.blocked) {
        return 'This table has Row Level Security (RLS) enabled and blocked anonymous access, which is good security practice.';
    }

    if (!table.rowCount || table.rowCount === 0) {
        return 'This table is accessible but contains no data or you lack permissions to read it.';
    }

    const hasSensitiveFields = table.sensitiveFields && table.sensitiveFields.length > 0;

    if (table.vulnerabilityLevel === 'critical') {
        return `This table does NOT have Row Level Security (RLS) enabled and contains ${table.rowCount} exposed rows${hasSensitiveFields ? ' with sensitive data like ' + table.sensitiveFields.map(f => f.fieldName).join(', ') : ''}. Anyone with the API key can read ALL data in this table.`;
    } else if (table.vulnerabilityLevel === 'high') {
        return `This table is publicly accessible with ${table.rowCount} rows exposed. RLS is not properly configured.`;
    } else if (table.vulnerabilityLevel === 'medium') {
        return `This table has ${table.rowCount} rows accessible. Consider if this data should be public.`;
    }

    return 'This table is accessible via the public API.';
}

/**
 * Copy text to clipboard with enhanced feedback
 */
async function copyText(text, button) {
    try {
        await navigator.clipboard.writeText(text);

        const originalText = button.innerHTML;
        const originalTitle = button.title;

        button.innerHTML = '✓ Copied';
        button.title = 'Copied!';
        button.style.background = 'var(--success-bg)';

        setTimeout(() => {
            button.innerHTML = originalText;
            button.title = originalTitle || 'Copy to clipboard';
            button.style.background = '';
        }, 2000);
    } catch (err) {
        error('Failed to copy:', err);
        button.innerHTML = '✗ Failed';
        button.style.background = 'var(--danger-bg)';

        setTimeout(() => {
            button.innerHTML = 'Copy Name';
            button.style.background = '';
        }, 2000);
    }
}

/**
 * Download PDF report
 */
async function downloadPDF() {
    if (!scanResults) return;

    // Create a simple text-based report since we don't have jsPDF library in extension
    const report = generatePDFContent();

    // Create a blob and download as text file (will be converted to PDF manually or via print)
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supabase-security-report-${currentDomain}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Generate PDF content
 */
function generatePDFContent() {
    const date = new Date().toLocaleString();
    let content = `SUPABASE SECURITY SCAN REPORT
====================================
Domain: ${currentDomain}
Scan Date: ${date}
Supabase URL: ${scanResults.supabaseUrl || 'N/A'}

SUMMARY
-------
Total Tables: ${scanResults.summary.totalTables}
Vulnerable Tables: ${scanResults.summary.vulnerableTables}
Protected Tables: ${scanResults.summary.blockedTables}
Total Rows Exposed: ${scanResults.summary.totalExposedRows || 0}

RISK ASSESSMENT
---------------
Overall Risk Score: ${calculateRiskScore(scanResults.tables)}/100
Risk Level: ${getRiskLevel(calculateRiskScore(scanResults.tables)).level}

`;

    // Critical Findings
    const criticalFindings = generateCriticalFindings(scanResults.tables);
    if (criticalFindings.length > 0) {
        content += `CRITICAL FINDINGS
-----------------\n`;
        criticalFindings.forEach((finding, idx) => {
            content += `${idx + 1}. ${finding.table}: ${finding.message}\n`;
        });
        content += '\n';
    }

    // Detailed Table Analysis
    content += `DETAILED TABLE ANALYSIS
-----------------------\n\n`;

    scanResults.tables.forEach(table => {
        content += `Table: ${table.tableName}\n`;
        content += `Status: ${table.blocked ? 'Protected (RLS Enabled)' : 'VULNERABLE (No RLS)'}\n`;
        content += `Rows Exposed: ${table.rowCount || 0}\n`;
        content += `Columns: ${table.columnCount || 0}\n`;

        if (table.sensitiveFields && table.sensitiveFields.length > 0) {
            content += `Sensitive Fields: ${table.sensitiveFields.map(f => f.fieldName).join(', ')}\n`;
        }

        if (!table.blocked && table.vulnerabilityLevel) {
            content += `\nREMEDIATION STEPS:\n`;
            const steps = getRemediationSteps(table.vulnerabilityLevel);
            steps.forEach((step, idx) => {
                content += `  ${idx + 1}. ${step}\n`;
            });

            content += `\nSUGGESTED RLS POLICY:\n`;
            content += generateRLSPolicy(table.tableName, table.vulnerabilityLevel);
            content += '\n';
        }

        content += '\n' + '='.repeat(50) + '\n\n';
    });

    return content;
}