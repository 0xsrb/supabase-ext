// Regex patterns for detecting Supabase credentials
const PATTERNS = {
    // JWT Pattern (Standard JWT format)
    JWT: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g,

    // Supabase Cloud URL
    SUPABASE_URL: /https:\/\/[a-z0-9-]+\.supabase\.co/gi,

    // Environment variable patterns
    ENV_VARS: [
        /(?:NEXT_PUBLIC_|VITE_|REACT_APP_|PUBLIC_)?SUPABASE[_-]?URL["']?\s*[:=]\s*["']?(https:\/\/[^"'\s,]+)/gi,
        /(?:["']?)(?:supabaseUrl|supabase_url|supabaseURL)(?:["']?\s*[:=]\s*["']?)(https:\/\/[^"'\s,]+)/gi,
        /(?:NEXT_PUBLIC_|VITE_|REACT_APP_|PUBLIC_)?SUPABASE[_-]?(?:ANON[_-]?)?KEY["']?\s*[:=]\s*["']?(eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*)/gi
    ]
};

// Sensitive field patterns
const SENSITIVE_FIELD_PATTERNS = {
    // Authentication & Credentials
    auth: [
        /\b(password|passwd|pwd)\b/i,
        /\b(api[_-]?key|apikey)\b/i,
        /\b(secret|private[_-]?key)\b/i,
        /\b(token|access[_-]?token|refresh[_-]?token)\b/i,
        /\b(jwt|auth[_-]?token)\b/i,
        /\b(session[_-]?id|session[_-]?key)\b/i
    ],

    // Personal Identifiable Information
    pii: [
        /\b(email|e[_-]?mail)\b/i,
        /\b(phone|mobile|telephone)\b/i,
        /\b(ssn|social[_-]?security)\b/i,
        /\b(passport|driver[_-]?license)\b/i,
        /\b(birth[_-]?date|dob|date[_-]?of[_-]?birth)\b/i,
        /\b(address|home[_-]?address|street)\b/i,
        /\b(full[_-]?name|first[_-]?name|last[_-]?name)\b/i
    ],

    // Financial Information
    financial: [
        /\b(credit[_-]?card|card[_-]?number|cc[_-]?num)\b/i,
        /\b(cvv|cvc|card[_-]?code)\b/i,
        /\b(iban|routing[_-]?number|account[_-]?number)\b/i,
        /\b(bank[_-]?account|financial)\b/i,
        /\b(payment|billing)\b/i
    ],

    // Health Information
    health: [
        /\b(medical|health[_-]?record)\b/i,
        /\b(diagnosis|prescription)\b/i,
        /\b(patient[_-]?id|mrn)\b/i
    ]
};

// Value validators
const VALUE_VALIDATORS = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    creditCard: /^[0-9]{13,19}$/,
    ssn: /^\d{3}-?\d{2}-?\d{4}$/,
    phone: /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/
};

// Severity levels for sensitive fields
const FIELD_SEVERITY = {
    critical: ['password', 'passwd', 'pwd', 'secret', 'private_key', 'api_key', 'apikey',
        'credit_card', 'card_number', 'cvv', 'ssn', 'social_security'],
    high: ['email', 'phone', 'token', 'jwt', 'session_id', 'passport', 'driver_license',
        'bank_account', 'iban', 'medical', 'health_record'],
    medium: ['address', 'birth_date', 'dob', 'full_name', 'payment', 'billing']
};

/**
 * Extract Supabase URLs and JWTs from text
 */
function extractCredentials(text) {
    const credentials = {
        urls: new Set(),
        jwts: new Set()
    };

    // Extract Supabase URLs
    const urlMatches = text.matchAll(PATTERNS.SUPABASE_URL);
    for (const match of urlMatches) {
        credentials.urls.add(match[0]);
    }

    // Extract from environment variable patterns
    PATTERNS.ENV_VARS.forEach(pattern => {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
            if (match[1]) {
                const extracted = match[1].replace(/["']/g, '');
                if (extracted.startsWith('https://')) {
                    credentials.urls.add(extracted);
                } else if (extracted.startsWith('eyJ')) {
                    credentials.jwts.add(extracted);
                }
            }
        }
    });

    // Extract JWTs
    const jwtMatches = text.matchAll(PATTERNS.JWT);
    for (const match of jwtMatches) {
        credentials.jwts.add(match[0]);
    }

    return {
        urls: Array.from(credentials.urls),
        jwts: Array.from(credentials.jwts)
    };
}

/**
 * Check if a field name is sensitive
 */
function isSensitiveField(fieldName) {
    const allPatterns = Object.values(SENSITIVE_FIELD_PATTERNS).flat();
    return allPatterns.some(pattern => pattern.test(fieldName));
}

/**
 * Get severity level for a field
 */
function getFieldSeverity(fieldName) {
    const normalizedField = fieldName.toLowerCase().replace(/[_-]/g, '_');

    if (FIELD_SEVERITY.critical.some(f => normalizedField.includes(f))) {
        return 'critical';
    }
    if (FIELD_SEVERITY.high.some(f => normalizedField.includes(f))) {
        return 'high';
    }
    if (FIELD_SEVERITY.medium.some(f => normalizedField.includes(f))) {
        return 'medium';
    }
    return 'low';
}

/**
 * Validate if a value matches sensitive data patterns
 */
function validateSensitiveValue(value) {
    if (typeof value !== 'string') return null;

    if (VALUE_VALIDATORS.email.test(value)) return 'email';
    if (VALUE_VALIDATORS.creditCard.test(value.replace(/[\s-]/g, ''))) return 'credit_card';
    if (VALUE_VALIDATORS.ssn.test(value)) return 'ssn';
    if (VALUE_VALIDATORS.phone.test(value)) return 'phone';

    return null;
}

/**
 * Analyze table data for sensitive information
 */
function analyzeTable(tableName, rows, schema = []) {
    const result = {
        tableName,
        rowCount: rows ? rows.length : 0,
        sensitiveFields: [],
        exposedColumns: schema || [],
        columnCount: schema ? schema.length : 0,
        vulnerabilityLevel: 'safe',
        findings: [],
        sampleData: rows ? rows.slice(0, 5) : []
    };

    if (!rows || rows.length === 0) {
        // If we have schema but no data, still mark columns as exposed
        if (schema && schema.length > 0) {
            result.columnCount = schema.length;
            result.exposedColumns = schema;
        }
        return result;
    }

    const sensitiveFieldsMap = new Map();
    const keys = Object.keys(rows[0] || {});

    // If no schema provided, extract from data
    if (!schema || schema.length === 0) {
        result.exposedColumns = keys.map(key => ({ name: key, type: 'unknown' }));
        result.columnCount = keys.length;
    }

    // Check column names for sensitive data
    keys.forEach(key => {
        if (isSensitiveField(key)) {
            const severity = getFieldSeverity(key);
            if (!sensitiveFieldsMap.has(key)) {
                sensitiveFieldsMap.set(key, {
                    fieldName: key,
                    severity,
                    detectionMethod: 'column_name',
                    sampleValues: []
                });
            }
        }
    });

    // Check values (sample first 3 rows)
    const sampleRows = rows.slice(0, 3);
    sampleRows.forEach(row => {
        Object.entries(row).forEach(([key, value]) => {
            const valueType = validateSensitiveValue(value);
            if (valueType) {
                if (!sensitiveFieldsMap.has(key)) {
                    sensitiveFieldsMap.set(key, {
                        fieldName: key,
                        severity: 'high',
                        detectionMethod: 'content_analysis',
                        valueType,
                        sampleValues: []
                    });
                }
                // Store obfuscated sample
                if (sensitiveFieldsMap.get(key).sampleValues.length < 2) {
                    sensitiveFieldsMap.get(key).sampleValues.push(obfuscateValue(value, valueType));
                }
            }
        });
    });

    result.sensitiveFields = Array.from(sensitiveFieldsMap.values());

    // Determine overall vulnerability level
    const severities = result.sensitiveFields.map(f => f.severity);
    if (severities.includes('critical')) {
        result.vulnerabilityLevel = 'critical';
    } else if (severities.includes('high')) {
        result.vulnerabilityLevel = 'high';
    } else if (severities.includes('medium')) {
        result.vulnerabilityLevel = 'medium';
    } else if (result.sensitiveFields.length > 0) {
        result.vulnerabilityLevel = 'low';
    }

    // Generate findings
    result.sensitiveFields.forEach(field => {
        result.findings.push({
            type: field.severity,
            message: `Sensitive field '${field.fieldName}' is publicly accessible`,
            field: field.fieldName,
            detection: field.detectionMethod
        });
    });

    return result;
}

/**
 * Obfuscate sensitive values for display
 */
function obfuscateValue(value, type) {
    if (!value) return '';

    const str = String(value);
    switch (type) {
        case 'email':
            const [local, domain] = str.split('@');
            return `${local[0]}***@${domain}`;
        case 'phone':
            return `***-***-${str.slice(-4)}`;
        case 'credit_card':
            return `****-****-****-${str.slice(-4)}`;
        case 'ssn':
            return `***-**-${str.slice(-4)}`;
        default:
            return str.length > 10 ? `${str.slice(0, 3)}...${str.slice(-3)}` : '***';
    }
}

/**
 * Generate vulnerability summary
 */
function generateSummary(tableAnalyses) {
    const summary = {
        totalTables: tableAnalyses.length,
        vulnerableTables: 0,
        criticalTables: 0,
        highRiskTables: 0,
        mediumRiskTables: 0,
        safeTables: 0,
        blockedTables: 0,
        totalSensitiveFields: 0,
        totalExposedRows: 0
    };

    tableAnalyses.forEach(analysis => {
        if (analysis.blocked) {
            summary.blockedTables++;
        } else if (analysis.vulnerabilityLevel === 'critical') {
            summary.criticalTables++;
            summary.vulnerableTables++;
            summary.totalExposedRows += analysis.rowCount || 0;
        } else if (analysis.vulnerabilityLevel === 'high') {
            summary.highRiskTables++;
            summary.vulnerableTables++;
            summary.totalExposedRows += analysis.rowCount || 0;
        } else if (analysis.vulnerabilityLevel === 'medium') {
            summary.mediumRiskTables++;
            summary.vulnerableTables++;
            summary.totalExposedRows += analysis.rowCount || 0;
        } else {
            summary.safeTables++;
        }

        summary.totalSensitiveFields += analysis.sensitiveFields ? analysis.sensitiveFields.length : 0;
    });

    return summary;
}

/**
 * Generate cURL command for fetching table data
 */
function generateCurlCommand(supabaseUrl, apiKey, tableName) {
    return `curl '${supabaseUrl}/rest/v1/${tableName}?limit=5' \\
  -H 'apikey: ${apiKey}' \\
  -H 'Authorization: Bearer ${apiKey}'`;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PATTERNS,
        SENSITIVE_FIELD_PATTERNS,
        extractCredentials,
        isSensitiveField,
        getFieldSeverity,
        analyzeTable,
        generateSummary,
        generateCurlCommand
    };
}
