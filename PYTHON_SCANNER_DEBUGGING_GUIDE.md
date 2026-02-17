# Python Scanner Debugging Guide

## 🔍 Common Issues & Solutions

### Issue 1: "No exposed Supabase JWT found" (Line 406)

**Symptom**: Script exits early with message `[-] No exposed Supabase JWT found`

**Root Cause**: The script requires BOTH a JWT AND a Supabase URL to proceed. If either is missing, it stops.

**Debug Steps**:
```bash
# Run with verbose output to see what's being found
python supabase-exposure-check.py --url https://example.com
```

**Check**:
1. Are JavaScript files being discovered? (Look for JS file URLs in output)
2. Are JWTs being extracted? (Check `findings.json` → `jwts` array)
3. Are Supabase URLs being extracted? (Check `findings.json` → `supabase_urls` array)

**Common Reasons**:
- Site uses dynamic JS loading (React/Vue/Angular) - JS files load after initial page load
- JWTs are in environment variables or build-time configs (not in client-side JS)
- Supabase URL uses custom domain not matching regex patterns
- Site uses server-side rendering (SSR) - credentials never exposed to client

---

### Issue 2: Empty `findings.json` or Missing Files

**Symptom**: Script runs but no JSON files appear in `output/` directory

**Root Cause**: Exception being caught silently or early exit

**Debug Steps**:
```bash
# Check if output directory exists
ls -la output/

# Check if domain-specific directory was created
ls -la output/example.com/

# Look for any JSON files
find output/ -name "*.json"
```

**Fix**: Add verbose error logging (see fixes below)

---

### Issue 3: Tables Found But No Data Dumped

**Symptom**: Script says "Found X tables" but all show as "blocked"

**Root Cause**: Row Level Security (RLS) is enabled and blocking access

**Expected Output**:
```
[+] Found 5 tables
  [-] users: blocked
  [-] posts: blocked
  [-] comments: blocked
```

**This is GOOD**: It means RLS is working correctly and protecting data.

**Check**: Look at `summary.json` → each table should have `"dumped": false` and `"status": 401 or 403`

---

### Issue 4: No Vulnerability Assessment Shown

**Symptom**: Tables dump successfully but no "VULNERABLE" or "Public data" messages

**Root Cause**: Logic error in vulnerability analysis (lines 436-446)

**Check**: Look for this output pattern:
```
[+] users: 100 rows - VULNERABLE (critical) - Sensitive fields: email, password
```

If you see just `[+] users: 100 rows` without vulnerability info, there's a bug.

---

## 🛠️ Debugging Commands

### 1. Test JWT Extraction
```python
# Create test file: test_jwt.py
import re
JWT_REGEX = re.compile(r'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+')

test_content = """
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiJ9.test"
"""

jwts = JWT_REGEX.findall(test_content)
print(f"Found {len(jwts)} JWTs: {jwts}")
```

### 2. Test Supabase URL Extraction
```python
# Create test file: test_url.py
import re

SUPABASE_CLOUD_REGEX = re.compile(r'https://[a-z0-9-]+\.supabase\.co')
test_content = 'const url = "https://myproject.supabase.co"'

urls = SUPABASE_CLOUD_REGEX.findall(test_content)
print(f"Found {len(urls)} URLs: {urls}")
```

### 3. Check Output Files
```bash
# After running scan, check what was created
tree output/

# View findings
cat output/example.com/findings.json | python -m json.tool

# View summary
cat output/example.com/summary.json | python -m json.tool

# Check table data
ls -lh output/example.com/tables/
```

---

## 📊 Expected File Structure

After a successful scan, you should see:

```
output/
└── example.com/
    ├── findings.json          # JWTs, URLs, vulnerability summary
    ├── summary.json           # Per-table analysis
    └── tables/
        ├── users.json         # Dumped table data (if accessible)
        ├── posts.json
        └── comments.json
```

### `findings.json` Structure:
```json
{
  "site": "https://example.com",
  "vulnerable": true,
  "supabase_urls": ["https://project.supabase.co"],
  "jwts": ["eyJ..."],
  "vulnerability_summary": {
    "total_tables_accessible": 3,
    "vulnerable_tables_count": 2,
    "critical_count": 1,
    "high_count": 1,
    "medium_count": 0
  }
}
```

### `summary.json` Structure:
```json
[
  {
    "table": "users",
    "rows": 100,
    "dumped": true,
    "vulnerable": true,
    "vulnerability_level": "critical",
    "sensitive_fields": ["email", "password_hash"]
  }
]
```

---

## 🚨 Critical Code Paths

### Path 1: Early Exit (No Results)
```
scan_site() → get_js_files() → scan_js() → No JWTs/URLs found → EXIT at line 406
```

### Path 2: RLS Blocking (Expected)
```
scan_site() → get_tables() → dump_table() → 401/403 status → "blocked" message
```

### Path 3: Success (Data Dumped)
```
scan_site() → get_tables() → dump_table() → 200 status → analyze_table_for_sensitive_data() → Write JSON
```

---

## 🔧 Quick Fixes

See `PYTHON_SCANNER_FIXES.md` for code patches to improve debugging and fix potential issues.

---

## 📝 Testing Checklist

- [ ] Script runs without Python errors
- [ ] `output/` directory is created
- [ ] `output/<domain>/` directory is created
- [ ] `findings.json` exists and contains site URL
- [ ] `findings.json` shows JWTs found (or empty array)
- [ ] `findings.json` shows Supabase URLs found (or empty array)
- [ ] If JWTs+URLs found: `summary.json` exists
- [ ] If tables accessible: `tables/*.json` files exist
- [ ] Console shows vulnerability assessment for each table
- [ ] Vulnerability summary printed at end (if any vulnerable tables)

---

## 💡 Pro Tips

1. **Test on a known vulnerable site first** - Use a test Supabase project you control
2. **Check browser DevTools** - See what JS files actually load (Network tab)
3. **Use `--url` for single site testing** - Easier to debug than batch mode
4. **Check `findings.json` first** - It's written even if scan fails early
5. **Look for SSL errors** - Script retries with `verify=False` but logs the error

---

**Next Steps**: See `PYTHON_SCANNER_FIXES.md` for specific code improvements.

