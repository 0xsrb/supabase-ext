# Installation Guide - Supabase Security Scanner v2.1.0

## 🚀 Quick Start (5 minutes)

### Step 1: Extract the Files
1. Locate the downloaded `supabase-exposure-check-v2.1.0.zip` file
2. Right-click and select "Extract All..." (Windows) or double-click (Mac)
3. Choose a permanent location (e.g., `Documents/Chrome Extensions/`)
4. **Important**: Don't delete this folder after installation!

### Step 2: Install in Chrome/Edge
1. Open your browser (Chrome or Edge)
2. Navigate to the extensions page:
   - **Chrome**: `chrome://extensions/`
   - **Edge**: `edge://extensions/`
   - Or click the puzzle icon → "Manage Extensions"

3. Enable **"Developer mode"**:
   - Look for a toggle in the top-right corner
   - Turn it ON (it should turn blue/green)

4. Click **"Load unpacked"** button:
   - A file browser will open
   - Navigate to the extracted folder
   - Select the folder containing `manifest.json`
   - Click "Select Folder"

5. **Success!** The extension icon should appear in your toolbar
   - Look for the Supabase Security Scanner icon
   - Pin it to your toolbar for easy access

### Step 3: Test the Extension
1. Visit any website that uses Supabase (or use the test page)
2. Click the extension icon
3. Click "Start Security Scan"
4. Review the results!

---

## 🎯 What's New in v2.1.0

### Major Features
- ✅ **4x Faster Scanning** - Parallel batch processing
- ✅ **Automated RLS Migration** - One-click SQL policy generation
- ✅ **Keyboard Shortcuts** - Ctrl+S, E, F, Esc
- ✅ **Network Resilience** - Retry logic with exponential backoff
- ✅ **Real-time Progress** - Percentage, ETA, batch tracking

### Performance Improvements
| Tables | v1.0.0 | v2.1.0 | Improvement |
|--------|--------|--------|-------------|
| 5 tables | ~6s | ~2s | **3x faster** |
| 10 tables | ~11s | ~3s | **3.7x faster** |
| 20 tables | ~22s | ~5s | **4.4x faster** |

---

## ⌨️ Keyboard Shortcuts

Once installed, use these shortcuts for faster workflow:

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Start new scan |
| `Ctrl+E` | Export results |
| `Ctrl+F` | Focus search box |
| `Escape` | Close extension |

*Note: Use `Cmd` instead of `Ctrl` on macOS*

---

## 🛠️ Using the RLS Migration Generator

One of the most powerful new features in v2.1.0:

1. **Run a scan** on a website with Supabase
2. **Review the results** - Look for vulnerable tables
3. **Click "Download Migration SQL"** button
4. **Open the downloaded .sql file** - Review the generated policies
5. **Apply to your database**:
   - Open Supabase Dashboard
   - Go to SQL Editor
   - Paste the SQL
   - Run the migration
6. **Re-scan** to verify the fixes worked!

### What It Generates

The generator automatically detects your table patterns and creates appropriate RLS policies:

- **User-Isolated** (user_id, owner_id) → User can only see their own data
- **Multi-Tenant** (org_id, tenant_id) → Users see their organization's data
- **Public-Optional** (is_public) → Public data or user's own data
- **Generic** → Authenticated users only

All SQL is **injection-safe** with properly quoted identifiers.

---

## 🔧 Troubleshooting

### Extension doesn't appear after installation
- Make sure "Developer mode" is enabled
- Try refreshing the extensions page
- Check that you selected the correct folder (containing manifest.json)

### "Manifest version not supported" error
- This extension requires Chrome 88+ or Edge 88+
- Update your browser to the latest version

### Scan button doesn't work
- Make sure you're on a webpage (not chrome:// or edge:// pages)
- Check browser console (F12) for errors
- Try refreshing the page and reopening the extension

### No Supabase credentials found
- The website might not use Supabase
- Credentials might be loaded dynamically (try waiting a few seconds)
- Check if the site uses environment variables instead of hardcoded keys

### Scan is slow
- v2.1.0 is 4x faster than v1.0.0 - make sure you have the latest version
- Large databases (50+ tables) may still take 10-15 seconds
- Network speed affects scan time

---

## 📚 Additional Resources

- **README.md** - Complete feature documentation
- **CHANGELOG.md** - Version history and release notes
- **TESTING_CHECKLIST.md** - QA testing guide
- **PORTFOLIO_READY_SUMMARY.md** - Technical details and metrics

---

## 🔒 Security & Privacy

### What This Extension Does
- ✅ Scans page source for Supabase credentials
- ✅ Tests API connections
- ✅ Enumerates accessible tables
- ✅ Analyzes RLS policies
- ✅ Generates remediation SQL

### What This Extension Does NOT Do
- ❌ Send data to external servers (everything runs locally)
- ❌ Store credentials or scan results
- ❌ Modify your database
- ❌ Access data outside the current tab

### Ethical Use Only
This tool is for **security testing and auditing purposes only**. Only use it on:
- Your own Supabase projects
- Projects where you have explicit permission to test
- Development/staging environments

**Never use this tool to access unauthorized data or exploit vulnerabilities.**

---

## 📞 Support

### Need Help?
- Check the troubleshooting section above
- Review the README.md for detailed documentation
- Check browser console (F12) for error messages

### Found a Bug?
- Note the browser version and OS
- Check if DEBUG mode shows any errors
- Document steps to reproduce

---

## ✅ Installation Checklist

- [ ] Downloaded supabase-exposure-check-v2.1.0.zip
- [ ] Extracted to permanent location
- [ ] Opened chrome://extensions/ or edge://extensions/
- [ ] Enabled "Developer mode"
- [ ] Clicked "Load unpacked"
- [ ] Selected the extracted folder
- [ ] Extension icon appears in toolbar
- [ ] Tested on a website
- [ ] Scan completed successfully
- [ ] Reviewed keyboard shortcuts

---

**Version**: 2.1.0 - Portfolio-Ready Edition  
**File Size**: 49 KB  
**Last Updated**: February 17, 2026  
**Compatibility**: Chrome 88+, Edge 88+

---

**🎉 You're all set! Start scanning for Supabase vulnerabilities! 🎉**

