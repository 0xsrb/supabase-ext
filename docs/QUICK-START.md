# Quick Start Guide - 5 Minutes to Running

## Step 1: Generate Icons (1 minute)

1. Double-click `create-icons.html`
2. Click the blue button "Generate Extension Icons"
3. Three files will download: `icon16.png`, `icon48.png`, `icon128.png`
4. Move all three files into the `icons/` folder in this directory

## Step 2: Load in Chrome (1 minute)

1. Open Chrome
2. Type in address bar: `chrome://extensions/`
3. Turn on **Developer mode** (switch in top-right)
4. Click **"Load unpacked"**
5. Choose this folder (`supabase-exposure-check`)
6. Extension appears! Pin it to toolbar (puzzle icon → pin)

## Step 3: Test It (3 minutes)

### Option A: Test on a Demo Site
1. Visit any website that uses Supabase
2. Click the extension icon
3. Click "Start Security Scan"
4. Wait for results

### Option B: Test on Your Own Site
1. Navigate to your Next.js/React app
2. Click the extension icon
3. Click "Start Security Scan"
4. Review findings

## What You'll See

### If Credentials Found:
- Green checkmark or Red warning
- List of discovered URLs and API keys
- Tables organized by risk level
- Download button for JSON report

### If No Credentials:
- Error message: "No Supabase credentials found"
- This means the page doesn't expose Supabase config

## Understanding Results

### 🔴 Red Badge (Critical/High)
**URGENT**: Contains passwords, API keys, SSN, credit cards
- **Action**: Enable RLS immediately, rotate keys

### 🟠 Orange Badge (Medium)
**Warning**: Contains emails, phone numbers, addresses
- **Action**: Enable RLS, consider data sensitivity

### 🟢 Green Badge (Protected)
**Good**: RLS is blocking access
- **Action**: None needed, this is secure

### 🔵 Blue Badge (Public/Safe)
**OK**: Accessible but no sensitive data
- **Action**: Verify this data should be public

## Common Issues

**Extension won't load?**
- Check that icons are in the `icons/` folder
- All three files must be present

**"No credentials found"?**
- Site doesn't use Supabase
- Credentials are server-side only
- Try a different page

**Scan takes forever?**
- Normal for sites with many JS files
- Wait up to 2-3 minutes for large sites
- Check console for errors (F12)

## Next Steps

- Read `README-EXTENSION.md` for full documentation
- Check `INSTALLATION.md` for detailed setup
- Review `EXTENSION_SPEC.md` for technical details

## Need Help?

1. Open browser console (F12)
2. Click extension icon → Right-click → "Inspect popup"
3. Look for error messages
4. Check that all files are present in folder

## Security Reminder

Only scan:
- ✅ Your own websites
- ✅ Sites you have permission to test
- ✅ During authorized security audits

Never use for:
- ❌ Unauthorized testing
- ❌ Malicious purposes
- ❌ Data harvesting

---

**That's it! You're ready to scan for Supabase exposures.**
