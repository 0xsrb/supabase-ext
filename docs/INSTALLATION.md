# Chrome Extension Installation Guide

## Prerequisites

You need Google Chrome or any Chromium-based browser (Edge, Brave, etc.)

## Installation Steps

### 1. Create Extension Icons

The extension requires icon files. You can either:

**Option A: Use online tools**
- Go to https://www.favicon-generator.org/
- Upload any image (logo, security icon, etc.)
- Download the PNG files in sizes: 16x16, 48x48, 128x128
- Rename them to `icon16.png`, `icon48.png`, `icon128.png`
- Place them in the `icons/` folder

**Option B: Use placeholder icons**
Create simple colored squares using any image editor:
- 16x16 pixels → `icons/icon16.png`
- 48x48 pixels → `icons/icon48.png`
- 128x128 pixels → `icons/icon128.png`

**Option C: Quick command (if you have ImageMagick installed)**
```bash
# Create simple placeholder icons
convert -size 16x16 xc:#667eea icons/icon16.png
convert -size 48x48 xc:#667eea icons/icon48.png
convert -size 128x128 xc:#667eea icons/icon128.png
```

### 2. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`

2. Enable **Developer mode** (toggle in top-right corner)

3. Click **"Load unpacked"** button

4. Navigate to this project folder and select it

5. The extension should now appear in your extensions list

6. Pin the extension to your toolbar for easy access (click the puzzle piece icon → pin)

## How to Use

1. **Navigate to a website** that might use Supabase (e.g., Next.js apps, React apps)

2. **Click the extension icon** in your toolbar

3. **Click "Start Security Scan"** button

4. **Wait for the scan to complete** - this will:
   - Scan the page for JavaScript files
   - Extract Supabase URLs and API keys
   - Test the credentials
   - Enumerate database tables
   - Analyze for sensitive data

5. **Review the results**:
   - Red badges = Critical/High risk (exposed PII, credentials)
   - Orange badges = Medium risk
   - Green badges = Protected by RLS
   - Blue badges = Public/Safe data

6. **Download the report** (optional):
   - Click "Download Report (JSON)" to save findings

## Testing the Extension

### Test on a Sample Site

You can test the extension on websites that use Supabase:

1. Any Supabase example project
2. Supabase documentation site (https://supabase.com)
3. Public GitHub repos with Supabase demos

### Expected Behavior

- **If credentials are found**: The extension will test them and show results
- **If no credentials found**: Error message will appear
- **If RLS is enabled**: Tables will show as "Protected"
- **If data is exposed**: You'll see vulnerability warnings

## Troubleshooting

### Extension won't load
- Make sure all files are in the correct location
- Check that `icons/` folder contains the required PNG files
- Look for errors in `chrome://extensions/` under the extension

### Scan fails immediately
- Check browser console (F12 → Console tab)
- The site might not use Supabase
- The site might have CSP (Content Security Policy) blocking

### CORS errors
- This is normal for some CDN-hosted scripts
- The extension will still scan inline scripts and accessible resources

### No tables found
- The API key might not have permissions
- RLS might be blocking everything (this is good!)

## Security Notes

⚠️ **Important**:
- This tool is for **authorized security testing only**
- Only scan websites you own or have permission to test
- Do not use for malicious purposes
- Exposed credentials should be reported responsibly

## File Structure

```
supabase-exposure-check/
├── manifest.json          # Extension configuration
├── popup.html            # Main UI
├── popup.css             # Styling
├── popup.js              # UI logic
├── content_script.js     # Page scanner
├── background.js         # Service worker (API calls)
├── utils.js              # Shared utilities
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── INSTALLATION.md       # This file
```

## Development

### Making Changes

1. Edit any of the `.js`, `.html`, or `.css` files
2. Go to `chrome://extensions/`
3. Click the **refresh icon** on your extension
4. Test your changes

### Debugging

- **Popup debugging**: Right-click extension icon → "Inspect popup"
- **Background worker**: Click "service worker" link in `chrome://extensions/`
- **Content script**: Open DevTools on the webpage (F12)

## Next Steps

- Customize the UI styling in `popup.css`
- Add more sensitive field patterns in `utils.js`
- Implement additional export formats (CSV, PDF)
- Add settings page for configuration
- Improve error handling and retry logic

## Support

For issues or questions:
- Check the original Python tool: `supabase-exposure-check.py`
- Review `EXTENSION_SPEC.md` for technical details
- Open browser console for error messages
