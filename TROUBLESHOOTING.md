# Troubleshooting Guide - Supabase Security Scanner

## 🔧 Common Issues and Solutions

### ❌ "Content script not loaded" Error

**Symptoms**: When you click "Start Security Scan", you get an error saying "Content script not loaded"

**Causes**:
1. Extension was just installed/updated and page wasn't refreshed
2. You're trying to scan a restricted page (chrome://, edge://, about:)
3. Extension permissions weren't granted properly

**Solutions**:

#### Solution 1: Reload the Extension (Most Common Fix)
1. Go to `chrome://extensions/` (or `edge://extensions/`)
2. Find "Supabase Security Scanner"
3. Click the **reload icon** (circular arrow) on the extension card
4. Go back to the website you want to scan
5. **Refresh the webpage** (F5 or Ctrl+R)
6. Click the extension icon and try scanning again

#### Solution 2: Refresh the Webpage
If you just installed the extension:
1. **Refresh the webpage** you want to scan (F5 or Ctrl+R)
2. Click the extension icon
3. Try scanning again

#### Solution 3: Check the Page Type
The extension cannot scan these pages:
- ❌ `chrome://` pages (Chrome settings, extensions)
- ❌ `edge://` pages (Edge settings)
- ❌ `about:` pages
- ❌ Chrome Web Store pages
- ❌ `file://` local files (unless you enable file access)

**Solution**: Navigate to a regular website (e.g., https://example.com) and try again

#### Solution 4: Enable File Access (for local HTML files)
If you want to scan local files:
1. Go to `chrome://extensions/`
2. Find "Supabase Security Scanner"
3. Click "Details"
4. Scroll down and enable **"Allow access to file URLs"**
5. Refresh your local file and try again

#### Solution 5: Check Permissions
1. Go to `chrome://extensions/`
2. Find "Supabase Security Scanner"
3. Click "Details"
4. Under "Permissions", verify it has:
   - ✅ Read and change all your data on all websites
   - ✅ Access your tabs
5. If missing, remove and reinstall the extension

---

### ❌ "No Supabase credentials found"

**Symptoms**: Scan completes but says no credentials were detected

**Causes**:
1. The website doesn't use Supabase
2. Credentials are loaded dynamically after page load
3. Credentials are in environment variables (not in page source)

**Solutions**:

#### Solution 1: Wait for Page to Fully Load
1. Make sure the website is **fully loaded** (no loading spinners)
2. Wait 2-3 seconds after page load
3. Try scanning again

#### Solution 2: Check if Site Uses Supabase
1. Open browser DevTools (F12)
2. Go to "Network" tab
3. Refresh the page
4. Look for requests to `*.supabase.co`
5. If none found, the site doesn't use Supabase

#### Solution 3: Try Different Pages
Some sites only load Supabase on specific pages:
- Try the login page
- Try the dashboard/app page
- Try pages that load user data

---

### ❌ Scan is Very Slow

**Symptoms**: Scan takes more than 30 seconds

**Causes**:
1. Database has many tables (50+)
2. Slow network connection
3. Supabase instance is rate-limiting requests

**Solutions**:

#### Solution 1: Wait Patiently
- v2.1.0 is 4x faster than v1.0.0
- 20 tables = ~5 seconds
- 50 tables = ~12 seconds
- 100+ tables = ~25 seconds

#### Solution 2: Check Network
1. Open DevTools (F12) → Network tab
2. Look for failed requests or slow responses
3. Check your internet connection

#### Solution 3: Rate Limiting
If you see many 429 errors:
- The Supabase instance is rate-limiting
- The extension will automatically retry with exponential backoff
- Wait for the scan to complete (it will handle retries)

---

### ❌ Extension Icon Not Showing

**Symptoms**: Can't find the extension icon in toolbar

**Solutions**:

#### Solution 1: Pin the Extension
1. Click the **puzzle icon** in Chrome toolbar
2. Find "Supabase Security Scanner"
3. Click the **pin icon** to pin it to toolbar

#### Solution 2: Check if Installed
1. Go to `chrome://extensions/`
2. Verify "Supabase Security Scanner" is listed
3. Make sure it's **enabled** (toggle is blue/on)

---

### ❌ "Failed to fetch" Errors

**Symptoms**: Scan fails with network errors

**Causes**:
1. Supabase instance is down
2. CORS issues
3. Invalid API key
4. Network connectivity issues

**Solutions**:

#### Solution 1: Check Supabase Status
1. Try accessing the Supabase URL directly in browser
2. Check if the API responds

#### Solution 2: Verify Credentials
1. Check if the detected URL and API key are correct
2. Try using them in Supabase client manually

#### Solution 3: Check Network
1. Disable VPN/proxy temporarily
2. Check firewall settings
3. Try on a different network

---

### ❌ Results Not Showing

**Symptoms**: Scan completes but results view is empty

**Solutions**:

#### Solution 1: Check Console
1. Right-click the extension popup
2. Select "Inspect"
3. Check Console tab for errors
4. Report any errors you find

#### Solution 2: Reload Extension
1. Go to `chrome://extensions/`
2. Reload the extension
3. Try scanning again

---

## 🐛 Reporting Bugs

If none of these solutions work:

### Information to Collect
1. **Browser**: Chrome/Edge version
2. **Extension version**: Check in `chrome://extensions/`
3. **Error message**: Exact text of the error
4. **Console errors**: 
   - Right-click extension popup → Inspect
   - Copy any red errors from Console tab
5. **Steps to reproduce**: What you did before the error

### Debug Mode
Enable debug logging:
1. Open `background.js` in the extension folder
2. Find `const DEBUG = false;` near the top
3. Change to `const DEBUG = true;`
4. Reload extension
5. Try scanning again
6. Check browser console for detailed logs

---

## ✅ Quick Checklist

Before reporting an issue, verify:

- [ ] Extension is installed and enabled
- [ ] Extension has been reloaded after installation/update
- [ ] Webpage has been refreshed after installing extension
- [ ] You're not on a chrome:// or edge:// page
- [ ] Website is fully loaded before scanning
- [ ] Browser is up to date (Chrome 88+ or Edge 88+)
- [ ] No console errors in DevTools

---

## 🆘 Still Having Issues?

### Reinstall the Extension
1. Go to `chrome://extensions/`
2. Remove "Supabase Security Scanner"
3. Close and reopen browser
4. Reinstall from the .zip file
5. Reload the extension
6. Refresh the webpage
7. Try again

### Try the Python Scanner
If the extension doesn't work, try the Python version:
```bash
python supabase-exposure-check.py --url https://example.com
```

---

**Last Updated**: February 17, 2026  
**Version**: 2.1.0

