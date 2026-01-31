# Testing Guide - Step by Step

## ✅ Pre-Flight Checklist

Run these commands to verify everything is ready:

```bash
# Verify all files exist
ls -la *.js *.html *.json
ls -la icons/

# Expected output:
# - manifest.json ✓
# - popup.html, popup.css, popup.js ✓
# - content_script.js ✓
# - background.js ✓
# - utils.js ✓
# - icons/icon16.svg, icon48.svg, icon128.svg ✓
```

## 🚀 Loading the Extension in Chrome

### Step 1: Open Extensions Page
1. Open Google Chrome
2. Type in address bar: `chrome://extensions/`
3. Press Enter

### Step 2: Enable Developer Mode
- Look for **"Developer mode"** toggle in the top-right corner
- Click it to enable (should turn blue/on)

### Step 3: Load Extension
1. Click **"Load unpacked"** button (top-left area)
2. Navigate to this folder: `supabase-exposure-check`
3. Click **"Select Folder"**

### Step 4: Verify Installation
You should see:
- ✓ Extension card appears with name "Supabase Exposure Check"
- ✓ Version 1.0.0
- ✓ No error messages
- ✓ Extension icon visible

### Step 5: Pin to Toolbar (Optional)
1. Click the puzzle piece icon in Chrome toolbar
2. Find "Supabase Exposure Check"
3. Click the pin icon to keep it visible

## 🧪 Testing the Extension

### Test 1: Basic Functionality Test (Local Test Page)

**What this tests:** Extension loads, scans page, detects credentials

1. **Open the test page:**
   ```bash
   # Open test-page.html in Chrome
   # Option 1: Double-click test-page.html
   # Option 2: File > Open File > select test-page.html
   ```

2. **Click the extension icon** in your toolbar

3. **Verify popup opens:**
   - Should show "Current Site: [local file path or localhost]"
   - Should have blue "Start Security Scan" button
   - Should have info box with bullet points

4. **Click "Start Security Scan"**

5. **Expected behavior:**
   - Progress view appears
   - Log shows: "Starting security scan..."
   - Log shows: "Found X inline scripts"
   - Log shows: "Found 3 Supabase URL(s)"
   - Log shows: "Found 3 JWT token(s)"
   - Log shows: "Testing connection to https://xyzcompany.supabase.co..."
   - **Will fail with:** "Assessment failed" (expected - these are fake credentials)

6. **Expected result:**
   - Error view appears
   - Shows: "Scan Failed"
   - Message about connection failure
   - "Try Again" button visible

✅ **PASS if:** Extension detects 3 URLs and 3 JWTs before connection fails

### Test 2: Real Website Test (Optional)

**What this tests:** Full end-to-end functionality

**Find a test site:**
- Supabase demo apps on GitHub
- Your own Supabase project
- Public Supabase examples

**Good test sites:**
```
https://supabase.com/dashboard (login page)
https://github.com/supabase/supabase/tree/master/examples
Any Next.js app with Supabase
```

1. Navigate to the website
2. Open extension popup
3. Click "Start Security Scan"
4. Wait for results (may take 1-3 minutes)

**If credentials found & valid:**
- Should show connection success
- Should enumerate tables
- Should show vulnerability summary
- Should allow JSON download

**If no credentials found:**
- Will show error: "No Supabase credentials found"
- This is normal for most sites

### Test 3: Error Handling Test

**Test invalid permissions:**
1. Go to `chrome://extensions/`
2. Try to scan (should show error - can't scan Chrome pages)

**Test no credentials:**
1. Visit google.com
2. Run scan
3. Should show: "No Supabase credentials found"

## 🐛 Debugging

### If extension won't load:

**Check console for errors:**
1. Go to `chrome://extensions/`
2. Find your extension
3. Click "Errors" button
4. Review any error messages

**Common issues:**
- ❌ Missing icon files → Solution: Icons are now SVG, should work
- ❌ Syntax error in JS → Check file contents
- ❌ Invalid manifest → Verify manifest.json

### If popup won't open:

**Debug popup:**
1. Right-click extension icon
2. Select "Inspect popup"
3. Check Console tab for errors

**Common issues:**
- utils.js not loading
- Syntax errors in popup.js
- CSP violations

### If scan doesn't work:

**Debug content script:**
1. Open website you're scanning
2. Press F12 (DevTools)
3. Go to Console tab
4. Look for errors

**Debug background worker:**
1. Go to `chrome://extensions/`
2. Click "service worker" link under extension
3. Check Console for errors

**Common issues:**
- Content script not injecting
- CORS errors (normal for some CDNs)
- Network timeouts

## 📊 What to Look For

### Successful Scan Results:

**Summary Card:**
- Total Tables: [number]
- Vulnerable: [number in red]
- Protected: [number in green]

**Credentials Section:**
- Shows discovered URLs
- Shows truncated JWTs

**Tables Section:**
- Grouped by severity
- Shows table names
- Shows sensitive fields with badges
- Color coding:
  - 🔴 Red = Critical/High risk
  - 🟠 Orange = Medium risk
  - 🟢 Green = Protected (RLS enabled)
  - 🔵 Blue = Public/Safe

**Export:**
- Download Report button works
- JSON file downloads with timestamp

### Performance Benchmarks:

- **Small site (1-5 JS files):** 10-30 seconds
- **Medium site (6-20 JS files):** 30-90 seconds
- **Large site (20+ JS files):** 1-3 minutes

## ✅ Testing Checklist

Complete this checklist:

- [ ] Extension loads without errors
- [ ] Extension icon appears in toolbar
- [ ] Popup opens when clicked
- [ ] Shows current domain correctly
- [ ] "Start Security Scan" button works
- [ ] Progress bar animates
- [ ] Log output appears
- [ ] Detects Supabase URLs in test page
- [ ] Detects JWT tokens in test page
- [ ] Shows appropriate error for fake credentials
- [ ] "Try Again" button works
- [ ] Can scan multiple times
- [ ] No console errors during normal operation

## 🎯 Next Steps After Testing

Once basic testing passes:
1. Test on real Supabase sites
2. Add requested features
3. Customize UI/styling
4. Add more detection patterns
5. Improve error messages

## 📝 Reporting Issues

If you find bugs, note:
- What you clicked
- What you expected
- What actually happened
- Console error messages
- Screenshots if possible
