# Supabase RLS Scanner - Testing Guide

## Quick Start

### 1. Load the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer Mode** (toggle in top right)
3. Click **Load unpacked**
4. Select this directory: `c:\Users\sweth\Desktop\Gemini\Sup\supabase-exposure-check`

### 2. Test the Scanner

1. Navigate to any website that uses Supabase
2. Click the extension icon in your browser toolbar
3. Click **Start Security Scan**
4. Wait for the scan to complete

### 3. Verify the Features

The scanner should now display:

✅ **RLS Vulnerability Badges**
- Red "⚠ RLS VULNERABLE" for exposed tables
- Green "PROTECTED" for secured tables

✅ **Detailed Metadata**
- Column count (e.g., "11 columns")
- Exposed row count (e.g., "🔓 8 rows exposed")

✅ **Expandable Table Details**
- Click any table to expand
- View all exposed column names in a grid
- See data preview with first 5 rows

✅ **Copy as cURL**
- Click "Copy as cURL" button
- Paste in terminal to manually verify exposure

## What Changed

The scanner now provides **comprehensive exposure detection**:

- **All columns are displayed**, not just sensitive ones
- **Actual data preview** from the first 5 rows
- **Accurate row counts** from the API
- **Better visual design** matching modern security tools

## Troubleshooting

**No credentials found:**
- Make sure the website actually uses Supabase
- Check that the page has loaded completely

**Scan fails:**
- Check browser console for errors (F12)
- Verify the Supabase API is accessible

**Tables don't expand:**
- Try reloading the extension
- Check that JavaScript is enabled

## Files Modified

- `background.js` - Added schema fetching and row counting
- `utils.js` - Enhanced analysis and added cURL generation
- `popup.js` - Rewrote table rendering with expandable details
- `popup.css` - Added comprehensive styling for new features

---

**Note:** This scanner is for security testing purposes only. Always get permission before testing on production systems.
