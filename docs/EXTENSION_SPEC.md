# Chrome Extension Specification: Supabase Exposure Check

## 1. Project Overview
**Name:** Supabase Exposure Check Extension
**Description:** A Chrome Extension that analyzes the current webpage to detect exposed Supabase JWT tokens and API URLs. It actively validates these credentials by attempting to enumerate database tables and identifying sensitive data (PII, credentials, etc.) within them, mirroring the functionality of the original Python CLI tool.

## 2. Architecture & Components

### 2.1 Manifest (V3)
*   **Permissions:**
    *   `activeTab`: To access the current page's DOM and content.
    *   `scripting`: To inject content scripts if needed (though `activeTab` might suffice for simple DOM scraping).
    *   `storage`: To save settings or recent scan results.
    *   `unlimitedStorage`: For potentially large table dumps.
*   **Host Permissions:**
    *   `<all_urls>`: Required to fetch linked JavaScript files (which may be on CDNs) and to query the discovered Supabase endpoints (`*.supabase.co`).

### 2.2 Components
1.  **Popup (UI):** Main interface for user interaction.
2.  **Content Script:** Injected into the active tab to scrape `<script src="...">` tags.
3.  **Background Service Worker / Offscreen Document:** Handles the heavy lifting of fetching external JS files, running regex analysis, and querying the Supabase API to avoid blocking the UI thread and handle CORS more permissively where possible.

## 3. Functional Requirements

### 3.1 Initialization & Scanning
*   **Trigger:** User clicks "Scan Current Site" in the popup.
*   **Step 1: Resource Discovery (Content Script):**
    *   Scan the DOM for all `<script>` tags with a `src` attribute.
    *   Scan inline scripts for potential keys.
    *   Return list of JS URLs to the extension core.
*   **Step 2: Static Analysis (Background/Popup):**
    *   Fetch the content of each discovered JS URL.
    *   **Regex Matching:** Apply patterns to find:
        *   Supabase Project URLs (`https://<id>.supabase.co`).
        *   Supabase Anon/Service Keys (JWTs).
        *   Environment variable definitions (e.g., `NEXT_PUBLIC_SUPABASE_URL`).

### 3.2 Vulnerability Assessment (The "Attack" Phase)
If a Supabase URL and JWT are found:
1.  **Validation:** Test connection to `<SUPABASE_URL>/rest/v1/`.
2.  **Enumeration:** Fetch list of exposed tables.
3.  **Data Sampling:**
    *   For each table, attempt to `GET` the first 10-20 rows.
    *   Handle HTTP 200 (Open) vs HTTP 401/403 (Protected/RLS).
4.  **Sensitive Data Detection:**
    *   Analyze column names (metadata analysis).
    *   Analyze row values (content analysis).
    *   **Heuristics:** Port the Python `SENSITIVE_FIELD_PATTERNS` to JavaScript.
    *   **Classification:** Tag tables as **Critical**, **High**, **Medium**, or **Safe/Public**.

### 3.3 Reporting & Export
*   **UI Display:**
    *   Status indicator (Safe / Vulnerable).
    *   List of discovered keys/URLs with **"Copy to Clipboard"** buttons.
    *   Tree view of tables with status icons.
*   **Filtering & Search:**
    *   **Search Bar:** Filter tables by name in real-time.
    *   **Severity Filters:** Checkboxes/Toggles for "Vulnerable Only", "Critical/High", "Show Blocked".
*   **Export:**
    *   **Formats:** JSON (full technical dump) and **CSV** (summary for spreadsheets).
    *   **Clipboard:** "Copy Summary" button for quick pasting into reports/Slack.

## 4. Technical Implementation Details

### 4.1 Regex Patterns (JavaScript Compatible)
The following patterns must be implemented in JavaScript. Note the adaptation for JS `RegExp`.

```javascript
const PATTERNS = {
    // Basic JWT Pattern
    JWT: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,

    // Supabase Cloud URL
    SUPABASE_URL: /https:\/\/[a-z0-9-]+\.supabase\.co/g,

    // Env Vars (Capture Group 1 is the URL)
    ENV_VARS: [
        /(?:NEXT_PUBLIC_|VITE_|REACT_APP_|PUBLIC_)?SUPABASE[_-]?URL["']?\s*[:=]\s*["']?(https:\/\/[^"'\s,]+)/gi,
        /(?:["']?)(?:supabaseUrl|supabase_url|supabaseURL)(?:["']?\s*[:=]\s*["']?)(https:\/\/[^"'\s,]+)/gi
    ]
};

const SENSITIVE_FIELDS = [
    // Auth & Creds
    /\bemail\b/i, /\bpassword\b/i, /\bpasswd\b/i, /\bapi[_-]?key\b/i, /\bsecret\b/i,
    /\btoken\b/i, /\bjwt\b/i, /\baccess[_-]?token\b/i,
    
    // PII
    /\bphone\b/i, /\bssn\b/i, /\bsocial[_-]?security\b/i, /\bpassport\b/i,
    
    // Financial
    /\bcredit[_-]?card\b/i, /\bcard[_-]?number\b/i, /\biban\b/i, /\bpayment\b/i
    
    // ... (Implement full list from Python script)
];
```

### 4.2 Supabase API Interaction
Use the standard REST interface for Supabase (PostgREST).

*   **List Tables:**
    *   `GET /rest/v1/`
    *   Headers: `{ apikey: <JWT>, Authorization: "Bearer <JWT>" }`
*   **Read Table Data:**
    *   `GET /rest/v1/<table_name>?limit=20`
    *   Headers: same as above.

### 4.3 Data Analysis Logic (JavaScript)
Implement a function `analyzeTable(rows)` that iterates over the sampled data.

```javascript
function analyzeTable(tableName, rows) {
    let sensitiveFields = new Set();
    let vulnerabilityLevel = 'none';

    if (!rows || rows.length === 0) return { level: 'none', sensitiveFields: [] };

    const keys = Object.keys(rows[0]);
    
    // Check Column Names
    keys.forEach(key => {
        if (isSensitiveField(key)) sensitiveFields.add(key);
    });

    // Check Values (Regex on content)
    rows.forEach(row => {
        Object.entries(row).forEach(([key, value]) => {
            if (isEmail(value) && key.includes('email')) sensitiveFields.add(key);
            if (isCreditCard(value)) sensitiveFields.add(key);
            // ... etc
        });
    });

    // Determine Level
    if (hasCriticalFields(sensitiveFields)) vulnerabilityLevel = 'critical';
    else if (hasHighFields(sensitiveFields)) vulnerabilityLevel = 'high';
    
    return { level: vulnerabilityLevel, sensitiveFields: Array.from(sensitiveFields) };
}
```

## 5. UI/UX Design

### 5.1 Popup Main Screen
*   **Header:** 
    *   Logo & Title.
    *   **Settings/Theme Toggle:** Icon to switch between Light/Dark mode.
*   **Action Area:**
    *   Display current Domain.
    *   Large "SCAN" button.
*   **Status Area:**
    *   Progress bar (e.g., "Scanning JS files...", "Checking Table 5/20...").
    *   Log output window (scrollable text area).

### 5.2 Results View (Post-Scan)
*   **Summary Card:**
    *   Total Tables Found.
    *   Vulnerable Tables (Red text).
    *   **Filter Controls:** Text input for table name search; Toggle for "Vulnerable Only".
*   **Accordion List:**
    *   **Group 1: Vulnerable (High/Critical)** - Expanded by default.
        *   Table Name (e.g., `users`).
        *   Row Count.
        *   Badges for detected fields (e.g., `[EMAIL]`, `[PASSWORD]`).
    *   **Group 2: Warning (Medium)**.
    *   **Group 3: Public/Safe**.
    *   **Group 4: Blocked (RLS enabled)**.
*   **Footer:**
    *   "Download JSON".
    *   "Download CSV".

## 6. Limitations & Edge Cases
*   **CORS:** While extensions have broad permissions, some CDNs might still block fetch requests. Use `no-cors` mode if necessary, though this limits content reading (fetching opaque responses is useless for analysis). The standard `fetch` from a background script with host permissions usually bypasses this.
*   **SSL:** Unlike the Python script, the Chrome Extension cannot easily bypass SSL errors (e.g., `verify=False`). Self-signed certs on target API endpoints might fail.
*   **Rate Limiting:** Aggressive scanning might trigger WAFs. Add a small delay between table requests if possible (e.g., 100ms).

## 7. Deliverables
1.  `manifest.json`
2.  `popup.html`, `popup.css`, `popup.js`
3.  `content_script.js`
4.  `background.js` (or `service_worker.js`)
5.  `icons/` folder.
