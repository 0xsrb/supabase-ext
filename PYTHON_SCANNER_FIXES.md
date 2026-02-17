# Python Scanner Fixes & Improvements

## 🐛 Critical Fixes

### Fix 1: Add Verbose Logging Mode

**Problem**: Hard to debug when things fail silently

**Solution**: Add `--verbose` flag and detailed logging

```python
# Add to parse_args() function (around line 532)
parser.add_argument(
    "--verbose", "-v",
    action="store_true",
    help="Enable verbose output for debugging"
)

# Add global variable at top (around line 14)
VERBOSE = False

# Update main() to set global (around line 547)
global VERBOSE
VERBOSE = args.verbose if hasattr(args, 'verbose') else False

# Add logging helper function (around line 507)
def log_verbose(message):
    """Print message only if verbose mode is enabled."""
    if VERBOSE:
        print(f"  [DEBUG] {message}")
```

---

### Fix 2: Better Error Handling in scan_site()

**Problem**: Line 406-408 exits silently without showing what was found

**Current Code** (lines 405-408):
```python
if not findings["jwts"] or not findings["supabase_urls"]:
    print("  [-] No exposed Supabase JWT found")
    write_json(site_dir, "findings.json", findings)
    return
```

**Improved Code**:
```python
# More detailed feedback
if not findings["supabase_urls"]:
    print("  [-] No Supabase URLs found in JavaScript files")
    log_verbose(f"Scanned {len(js_files)} JS files")
    write_json(site_dir, "findings.json", findings)
    return

if not findings["jwts"]:
    print(f"  [-] No JWTs found (found {len(findings['supabase_urls'])} Supabase URL(s))")
    log_verbose(f"Supabase URLs: {findings['supabase_urls']}")
    print("  [!] Site uses Supabase but JWT is not exposed in client-side code")
    write_json(site_dir, "findings.json", findings)
    return
```

---

### Fix 3: Show JS Files Being Scanned

**Problem**: No visibility into which JS files are being checked

**Add to scan_site()** (after line 395):
```python
js_files = get_js_files(site_url)
print(f"  [*] Found {len(js_files)} JavaScript files to scan")
log_verbose(f"JS files: {js_files[:5]}...")  # Show first 5

if not js_files:
    print("  [!] No JavaScript files found on page")
    print("  [!] Site may use dynamic loading or SSR")
    write_json(site_dir, "findings.json", findings)
    return
```

---

### Fix 4: Catch and Log Exceptions in scan_js()

**Problem**: Failures in JS scanning are silent

**Current Code** (lines 196-205):
```python
def scan_js(js_url):
    r = safe_get(js_url)
    if not r:
        return [], []

    content = r.text
    return (
        JWT_REGEX.findall(content),
        extract_supabase_urls(content)
    )
```

**Improved Code**:
```python
def scan_js(js_url):
    log_verbose(f"Scanning: {js_url}")
    r = safe_get(js_url)
    if not r:
        log_verbose(f"Failed to fetch: {js_url}")
        return [], []

    try:
        content = r.text
        jwts = JWT_REGEX.findall(content)
        urls = extract_supabase_urls(content)
        
        if jwts:
            log_verbose(f"Found {len(jwts)} JWT(s) in {js_url}")
        if urls:
            log_verbose(f"Found {len(urls)} Supabase URL(s) in {js_url}")
        
        return jwts, urls
    except Exception as e:
        log_verbose(f"Error parsing {js_url}: {e}")
        return [], []
```

---

### Fix 5: Better Table Enumeration Error Handling

**Problem**: Line 348 raises exception that might be caught silently

**Current Code** (lines 345-354):
```python
def get_tables(base_url, headers):
    r = safe_get(f"{base_url}/rest/v1/", headers=headers)
    if not r or r.status_code != 200:
        raise Exception("Cannot enumerate tables")

    return [
        p.strip("/")
        for p in r.json().get("paths", {})
        if not p.startswith("/rpc") and p != "/"
    ]
```

**Improved Code**:
```python
def get_tables(base_url, headers):
    url = f"{base_url}/rest/v1/"
    log_verbose(f"Enumerating tables from: {url}")
    
    r = safe_get(url, headers=headers)
    if not r:
        raise Exception(f"Cannot connect to Supabase API: {url}")
    
    if r.status_code != 200:
        raise Exception(f"Cannot enumerate tables (HTTP {r.status_code}): {r.text[:200]}")

    try:
        data = r.json()
        paths = data.get("paths", {})
        
        if not paths:
            log_verbose(f"API response: {data}")
            raise Exception("No 'paths' in OpenAPI schema - API may have changed")
        
        tables = [
            p.strip("/")
            for p in paths
            if not p.startswith("/rpc") and p != "/"
        ]
        
        log_verbose(f"Found tables: {tables}")
        return tables
        
    except json.JSONDecodeError as e:
        raise Exception(f"Invalid JSON response from API: {e}")
```

---

### Fix 6: Show Progress During Table Dumping

**Problem**: No feedback during long table dumps

**Add to dump_table()** (after line 368):
```python
chunk = r.json()
rows.extend(chunk)

# Add progress indicator
if VERBOSE and len(chunk) == PAGE_SIZE:
    print(f"      ... fetched {len(rows)} rows so far", end='\r')

if len(chunk) < PAGE_SIZE:
    break
```

---

### Fix 7: Always Write findings.json

**Problem**: If exception occurs, no output files are written

**Add to scan_site()** (wrap try-except around lines 423-467):
```python
try:
    tables = get_tables(base_url, supabase_headers)
    print(f"  [+] Found {len(tables)} tables")
    
    # ... existing table dumping code ...
    
except Exception as e:
    print(f"  [-] Supabase error: {e}")
    log_verbose(f"Full error: {type(e).__name__}: {str(e)}")
    
    # Still write findings even if scan failed
    findings["error"] = str(e)
    findings["error_type"] = type(e).__name__

finally:
    # ALWAYS write findings.json
    write_json(site_dir, "findings.json", findings)
    
    # Only write summary if we have data
    if summary:
        write_json(site_dir, "summary.json", summary)
```

---

## 🚀 Quick Apply Script

To apply all fixes automatically, run:

```bash
# Backup original
cp supabase-exposure-check.py supabase-exposure-check.py.backup

# Apply fixes (manual - see individual fixes above)
# Or use the improved version below
```

---

## 📋 Testing After Fixes

```bash
# Test with verbose mode
python supabase-exposure-check.py --url https://example.com --verbose

# Expected output with fixes:
# 🌐 Scanning https://example.com
#   [*] Found 15 JavaScript files to scan
#   [DEBUG] Scanning: https://example.com/static/js/main.abc123.js
#   [DEBUG] Found 1 JWT(s) in https://example.com/static/js/main.abc123.js
#   [DEBUG] Found 1 Supabase URL(s) in https://example.com/static/js/main.abc123.js
#   🚨 VULNERABLE: Supabase JWT exposed
#   [DEBUG] Enumerating tables from: https://project.supabase.co/rest/v1/
#   [DEBUG] Found tables: ['users', 'posts', 'comments']
#   [+] Found 3 tables
#   ...
```

---

## 🎯 Priority Order

1. **Fix 2** - Better error messages (immediate value)
2. **Fix 1** - Verbose logging (essential for debugging)
3. **Fix 7** - Always write findings.json (prevents data loss)
4. **Fix 3** - Show JS files (helps understand what's being scanned)
5. **Fix 4** - Better scan_js logging (find where JWTs are)
6. **Fix 5** - Better table enumeration (catch API changes)
7. **Fix 6** - Progress indicators (nice to have)

---

**Next**: Apply these fixes to `supabase-exposure-check.py`

