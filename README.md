# Supabase Security Scanner

![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Chrome Extension](https://img.shields.io/badge/chrome-extension-orange.svg)
![Performance](https://img.shields.io/badge/performance-4x_faster-brightgreen.svg)

**Portfolio-Ready Edition** - A powerful browser extension that scans websites for exposed Supabase credentials and analyzes database security vulnerabilities with automated remediation.

---

## ✨ What's New in v2.1.0 - Portfolio-Ready Edition

### 🚀 Major Performance Improvements
- **4x Faster Scanning** - Parallel batch processing (20 tables: 22s → 5s)
- **Network Resilience** - Exponential backoff retry logic (3 attempts)
- **Real-time Progress** - Percentage display with ETA calculation
- **Batch Processing** - 5 tables scanned simultaneously

### 🔧 New Features
- **🛠️ Automated RLS Migration Generator** - One-click download of production-ready SQL policies
- **🧠 Intelligent Pattern Detection** - Detects user-isolated, multi-tenant, public-optional patterns
- **⌨️ Keyboard Shortcuts** - Ctrl+S (scan), Ctrl+E (export), Ctrl+F (search), Esc (close)
- **🎨 Enhanced UX** - Loading skeletons, section badges, professional empty states
- **📊 Progress Tracking** - Real-time percentage, ETA, and batch information

### 🔒 Security Improvements
- **SQL Injection Prevention** - Proper identifier quoting in generated policies
- **Secure Code Generation** - Validated, production-ready RLS policies
- **Partial Failure Handling** - Continues scanning even if individual tables fail

### 📊 Performance Metrics

| Tables | v1.0.0 | v2.1.0 | Improvement |
|--------|--------|--------|-------------|
| 5 tables | ~6s | ~2s | **3x faster** |
| 10 tables | ~11s | ~3s | **3.7x faster** |
| 20 tables | ~22s | ~5s | **4.4x faster** |

See [CHANGELOG.md](CHANGELOG.md) for complete details.

---

## 🎯 Features

### Security Scanning
- 🔍 **Credential Detection** - Finds exposed Supabase URLs and API keys in page source
- 🔒 **RLS Vulnerability Detection** - Identifies tables without Row Level Security
- ⚠️ **Sensitive Data Detection** - Flags PII, credentials, financial data, medical records
- 📊 **Risk Scoring** - 0-100 security score with severity levels (Critical, High, Medium, Low)
- 📈 **Vulnerability Categorization** - Automatic classification by risk level

### Data Analysis
- 📋 **Data Preview** - Shows 15 rows of exposed data per table
- 🔢 **Row Counting** - Displays total exposed rows per table
- 🏷️ **Column Analysis** - Identifies sensitive column types with icons
- 📊 **Schema Detection** - Analyzes table structure and relationships
- 🎯 **Pattern Recognition** - Detects common security patterns

### Automation & Export
- 🛠️ **Automated RLS Migration** - One-click SQL policy generation ⭐ NEW
- 🧠 **Intelligent Pattern Detection** - User-isolated, multi-tenant, public-optional, generic ⭐ NEW
- 💾 **Multiple Export Formats** - JSON, CSV, and SQL
- 📄 **Detailed Reports** - Comprehensive security assessment
- 🔐 **SQL Injection Prevention** - Secure code generation ⭐ NEW

### Performance & Reliability
- ⚡ **4x Faster Scanning** - Parallel batch processing (5 tables per batch) ⭐ NEW
- 🔄 **Network Resilience** - Exponential backoff retry logic (3 attempts) ⭐ NEW
- 📊 **Real-time Progress** - Percentage, ETA, and batch tracking ⭐ NEW
- 🎯 **Partial Failure Handling** - Continues scanning even if individual tables fail ⭐ NEW

### User Experience
- ⌨️ **Keyboard Shortcuts** - Power user features (Ctrl+S, E, F, Esc) ⭐ NEW
- 🎨 **Professional UI** - Loading states, progress tracking, empty states ⭐ NEW
- 📱 **Responsive Design** - Works on different screen sizes
- 🌓 **Modern Interface** - Clean, professional design
- 🏷️ **Section Badges** - Visual count indicators ⭐ NEW

---

## ⌨️ Keyboard Shortcuts

Power user features for faster workflow:

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Start new scan |
| `Ctrl+E` | Export results |
| `Ctrl+F` | Focus search box |
| `Escape` | Close extension |

*Note: Use `Cmd` instead of `Ctrl` on macOS*

---

## 🛠️ Automated RLS Migration Generator

v2.1.0 introduces intelligent RLS policy generation that saves hours of manual SQL writing:

### Pattern Detection

The scanner automatically detects your table structure and generates appropriate policies:

#### 1. User-Isolated Pattern
Detects columns: `user_id`, `owner_id`, `created_by`, `author_id`, `uid`

```sql
-- Enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can only access their own posts"
ON posts FOR ALL
USING (auth.uid() = user_id);
```

#### 2. Multi-Tenant Pattern
Detects columns: `org_id`, `organization_id`, `tenant_id`, `company_id`, `workspace_id`

```sql
-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Users can access their organization's data
CREATE POLICY "Users can access their organization's documents"
ON documents FOR ALL
USING (org_id = current_setting('app.current_org_id')::uuid);
```

#### 3. Public-Optional Pattern
Detects columns: `is_public`, `visibility`, `public`

```sql
-- Enable RLS
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Public data or user's own data
CREATE POLICY "Public articles or user's own articles"
ON articles FOR SELECT
USING (is_public = true OR auth.uid() = user_id);
```

#### 4. Generic Authenticated Pattern
Fallback for tables without specific patterns:

```sql
-- Enable RLS
ALTER TABLE generic_table ENABLE ROW LEVEL SECURITY;

-- Authenticated users only
CREATE POLICY "Authenticated users only"
ON generic_table FOR ALL
TO authenticated
USING (true);
```

### Usage

1. Run a security scan
2. Click **"Download Migration SQL"** button
3. Review the generated SQL file
4. Apply to your Supabase database via SQL Editor

**Security**: All table and column names are properly quoted to prevent SQL injection.

---

## 📦 Installation

### Chrome/Edge Extension (Recommended)

1. Download **`supabase-exposure-check-v2.1.0.zip`** (49 KB)
2. Extract the zip file to a folder
3. Open Chrome/Edge and navigate to `chrome://extensions/`
4. Enable "Developer mode" (top right toggle)
5. Click "Load unpacked"
6. Select the extracted folder containing the extension files
7. The extension icon will appear in your toolbar

**Note**: v2.1.0 includes significant performance improvements. Update from v1.0.0 for 4x faster scanning.

### What's Included in the Zip
- Extension files (manifest.json, popup.html/js/css, background.js)
- RLS migration generator (remediation-generator.js)
- Utilities and dependencies
- Extension icons (16px, 48px, 128px)

---

## 🎯 How to Use

1. **Navigate** to any website that uses Supabase
2. **Click** the extension icon in your toolbar
3. **Press** "Start Security Scan"
4. **Review** the results:
   - Risk score and summary
   - Critical findings
   - Vulnerable tables (expandable)
   - Data previews
5. **Export** results as JSON or CSV if needed
6. **Take action** to fix vulnerabilities

---

## 📊 Understanding Results

### Risk Levels
- 🔴 **CRITICAL (75-100)** - Immediate action required
- 🟠 **HIGH (50-74)** - Fix within 24 hours
- 🟡 **MEDIUM (25-49)** - Fix within a week
- 🟢 **LOW (0-24)** - Monitor and plan fixes

### Vulnerability Types
- **Critical**: Passwords, API keys, credit cards, SSN
- **High**: Emails, phone numbers, tokens, medical records
- **Medium**: Addresses, names, dates of birth
- **Low**: Public or non-sensitive data

### Table Status
- 🚨 **Critical/High Risk** - RLS disabled with sensitive data
- ⚠️ **Medium Risk** - RLS disabled or data exposure
- ✅ **Protected** - RLS enabled (blocked access)
- ℹ️ **Public/Safe** - No sensitive data detected

---

## 🔧 What to Do When Vulnerabilities Are Found

### Automated Fix (Recommended) ⭐ NEW
1. Click **"Download Migration SQL"** button in the extension
2. Review the generated SQL policies
3. Apply to your database via Supabase SQL Editor
4. Re-scan to verify fixes

### Manual Actions:
1. **Enable RLS** on all tables with sensitive data
2. **Review policies** - Ensure they're restrictive enough
3. **Rotate keys** if service_role key is exposed
4. **Audit access logs** to see if data was accessed
5. **Update frontend** to use proper authentication

### Example Manual Fix (SQL):
```sql
-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Add policy for user isolation
CREATE POLICY "Users can only see their own data"
ON users FOR SELECT
USING (auth.uid() = id);

-- Add policy for updates
CREATE POLICY "Users can only update their own data"
ON users FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
```

---

## 📚 Documentation

### Core Documentation
- **CHANGELOG.md** - Complete version history and release notes
- **IMPLEMENTATION_STATUS.md** - Development progress and technical details
- **TESTING_CHECKLIST.md** - Comprehensive QA testing guide
- **PORTFOLIO_READY_SUMMARY.md** - Executive summary and metrics

### Code Review & Improvements
- **COMPREHENSIVE_IMPROVEMENT_RECOMMENDATIONS.md** - Detailed code analysis
- **TOP_5_IMPLEMENTATION_GUIDE.md** - Priority improvements with code examples
- **QUICK_WINS.md** - Fast improvements (< 1 hour each)
- **REVIEW_SUMMARY.md** - Overall assessment and roadmap

---

## 🛠️ Development

### Project Structure

```
supabase-exposure-check/
├── manifest.json              # Extension manifest (v2.1.0)
├── popup.html/js/css         # Main UI with keyboard shortcuts
├── background.js             # Service worker (parallel scanning)
├── content_script.js         # Page analysis
├── remediation-generator.js  # RLS policy generator (NEW in v2.1.0)
├── utils.js                  # Shared utilities
├── CHANGELOG.md              # Version history
└── docs/                     # Documentation
```

### Debug Mode

Enable debug logging for development:

```javascript
// In popup.js and background.js
const DEBUG = true;  // Set to false for production
```

When `DEBUG = true`, detailed console logs will appear. When `false`, only errors are logged.

### Testing

See [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md) for comprehensive testing guide covering:
- All new features (keyboard shortcuts, parallel scanning, RLS generator)
- Performance benchmarks
- Error handling
- Edge cases

---

## 🎯 Roadmap

### ✅ Completed in v2.1.0

1. ✅ **Automated Remediation** - One-click SQL policy generation
2. ✅ **Performance Optimization** - 4x faster with parallel scanning
3. ✅ **Enhanced UX** - Keyboard shortcuts, loading states, progress tracking
4. ✅ **Network Resilience** - Retry logic with exponential backoff

### 🔜 Coming Soon (v2.2+)

1. **Enhanced Exports** - Detailed PDF reports with executive summaries
2. **Historical Comparison** - Track security improvements over time
3. **RLS Policy Analyzer** - Deep analysis of existing policy configurations
4. **Real-time Monitoring** - Background scanning with notifications
5. **Multi-Database Support** - Scan multiple Supabase instances

See [COMPREHENSIVE_IMPROVEMENT_RECOMMENDATIONS.md](COMPREHENSIVE_IMPROVEMENT_RECOMMENDATIONS.md) for detailed specifications.

---

## 🐛 Known Issues

None currently. Report issues via GitHub.

---

## 🤝 Contributing

Contributions welcome! Areas where help is needed:
- Additional sensitive data patterns
- Performance optimizations
- UI/UX improvements
- Documentation
- Testing

---

## 📄 License

[Your License Here]

---

## ⚠️ Disclaimer

This tool is for **security testing and auditing purposes only**. Only use it on:
- Your own Supabase projects
- Projects where you have explicit permission to test
- Development/staging environments

**Never use this tool to:**
- Access unauthorized data
- Test production systems without permission
- Exploit vulnerabilities for malicious purposes

---

## 🙏 Acknowledgments

- Built for the Supabase community
- Inspired by security best practices
- Thanks to all contributors and testers

---

## 📞 Support

- **Issues**: [GitHub Issues]
- **Questions**: [GitHub Discussions]
- **Email**: [Your Email]
- **Twitter**: [Your Twitter]

---

## 📈 Project Stats

- **Version**: 2.1.0 (Portfolio-Ready Edition)
- **Last Updated**: February 17, 2026
- **Performance**: 4x faster than v1.0.0
- **Code Quality**: 757 lines of new production code
- **Features**: 15 new features in v2.1.0
- **Documentation**: 6 comprehensive guides

---

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

### Recent Updates
- **v2.1.0** (2026-02-17) - Portfolio-Ready Edition: 4x performance, RLS generator, keyboard shortcuts
- **v2.0.0** (2026-01-31) - Enhanced UI, 15-row preview, improved toggles
- **v1.0.0** (2024-01-15) - Initial release

---

## 🎯 Portfolio Highlights

This project demonstrates:

### Technical Skills
- **Performance Engineering** - Parallel processing, batch optimization, 4x speed improvement
- **Security Expertise** - SQL injection prevention, RLS best practices, vulnerability detection
- **Full-Stack Development** - Chrome Extension Manifest v3, REST APIs, responsive UI
- **Code Quality** - JSDoc documentation, error handling, modular architecture

### Problem-Solving
- Identified bottleneck (sequential scanning)
- Designed solution (parallel batching)
- Implemented with safeguards (rate limiting, retries)
- Measured results (4x improvement)

### User Experience
- Keyboard accessibility
- Real-time feedback
- Helpful error messages
- Professional UI/UX

---

## 🌟 Star History

If you find this tool useful, please star the repository!

---

**Made with ❤️ for the Supabase community**

**Portfolio-Ready Edition** - Showcasing advanced performance optimization, security expertise, and professional code quality.
