# Supabase Exposure Check - Chrome Extension

A Chrome Extension that automatically detects exposed Supabase credentials and analyzes database security by testing for publicly accessible tables and sensitive data exposure.

## Quick Start

### Step 1: Generate Icons

Open `create-icons.html` in your browser:
1. Double-click `create-icons.html`
2. Click "Generate Extension Icons"
3. Three PNG files will download
4. Move them to the `icons/` folder

### Step 2: Load Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this folder
5. Extension is ready!

### Step 3: Use It

1. Visit any website (especially Next.js, React apps)
2. Click the extension icon
3. Click "Start Security Scan"
4. Review the results

## What It Does

The extension performs comprehensive security testing:

1. **Credential Discovery**
   - Scans all JavaScript files (external and inline)
   - Finds Supabase URLs (*.supabase.co)
   - Extracts JWT tokens (anon/service keys)
   - Detects environment variables

2. **Validation**
   - Tests discovered credentials
   - Connects to Supabase REST API
   - Verifies key permissions

3. **Enumeration**
   - Lists all database tables
   - Tests access to each table
   - Identifies RLS-protected vs exposed tables

4. **Analysis**
   - Samples data from accessible tables (first 20 rows)
   - Detects sensitive fields:
     - Authentication (passwords, API keys, tokens)
     - PII (emails, phone numbers, SSN)
     - Financial (credit cards, bank accounts)
     - Health information
   - Categorizes by severity (Critical/High/Medium/Low)

5. **Reporting**
   - Visual dashboard with vulnerability status
   - Detailed table analysis
   - Exportable JSON report

## Results Interpretation

### Vulnerability Levels

- **🔴 Critical/High**: Contains passwords, API keys, credit cards, SSN, etc.
- **🟠 Medium**: Contains emails, addresses, phone numbers
- **🟢 Protected**: RLS enabled, access denied (good!)
- **🔵 Public/Safe**: No sensitive data detected

### What to Do

**If vulnerabilities are found:**
1. Enable Row Level Security (RLS) on affected tables
2. Rotate exposed API keys immediately
3. Review and remove sensitive data if possible
4. Implement proper authentication

**If everything is protected:**
- Great! Your Supabase configuration is secure
- Keep monitoring for future changes

## Technical Details

### Files

- `manifest.json` - Extension configuration
- `popup.html/css/js` - User interface
- `content_script.js` - Page DOM scanner
- `background.js` - API testing service worker
- `utils.js` - Analysis patterns and logic

### Permissions

- `activeTab` - Access current page DOM
- `scripting` - Inject content scripts
- `storage` - Save scan results
- `<all_urls>` - Fetch external JS files and query Supabase APIs

### Privacy

- All scanning happens locally in your browser
- No data is sent to external servers
- Credentials are never stored or transmitted
- Use only for authorized security testing

## Advanced Usage

### Custom Patterns

Edit `utils.js` to add more sensitive field patterns:

```javascript
const SENSITIVE_FIELD_PATTERNS = {
    custom: [
        /\byour[_-]?pattern\b/i
    ]
};
```

### Export Format

The JSON report includes:
```json
{
  "scanDate": "2024-01-31T...",
  "domain": "example.com",
  "supabaseUrl": "https://xxx.supabase.co",
  "summary": {
    "totalTables": 10,
    "vulnerableTables": 2,
    "criticalTables": 1
  },
  "tables": [...]
}
```

## Troubleshooting

### No credentials found
- The site might not use Supabase
- Credentials might be in server-side code only
- Check if using custom domains

### Scan fails
- CORS might block some external scripts
- API key might be invalid
- Network connection issues

### Extension won't load
- Make sure icons are in `icons/` folder
- Check for errors in `chrome://extensions/`
- Verify all files are present

## Security Warning

⚠️ **Use Responsibly**

This tool is designed for:
- Testing your own applications
- Authorized security audits
- Educational purposes
- Responsible disclosure

Do NOT use for:
- Unauthorized access attempts
- Malicious purposes
- Harvesting credentials
- Data theft

## Comparison with Python CLI

| Feature | Chrome Extension | Python CLI |
|---------|------------------|------------|
| Installation | Load unpacked | pip install |
| Usage | One-click scan | Command line |
| Target | Active webpage | Any URL |
| Performance | Browser-based | Native Python |
| Results | Visual dashboard | JSON + Terminal |
| Export | JSON download | File output |

## Contributing

To improve the extension:

1. Add more sensitive field patterns in `utils.js`
2. Enhance UI/UX in `popup.html` and `popup.css`
3. Improve error handling in `background.js`
4. Add more export formats (CSV, PDF)
5. Implement settings page

## Related

- Python CLI tool: `supabase-exposure-check.py`
- Specification: `EXTENSION_SPEC.md`
- Installation guide: `INSTALLATION.md`

## License

Same as the parent project. Use for authorized security testing only.

## Acknowledgments

Based on the original Python CLI tool for Supabase security auditing.
