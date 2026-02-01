# Supabase Security Scanner - Version 2.0

A powerful browser extension that scans websites for exposed Supabase credentials and analyzes database security vulnerabilities.

---

## 🎉 What's New in V2.0

### Changes Made Today (Jan 31, 2026)

✅ **Removed "Copy as cURL" button** - Simplified UI  
✅ **Increased data preview from 5 to 15 rows** - Better visibility  
✅ **Fixed toggle functionality** - Smooth animations and reliable expanding/collapsing  
✅ **Improved event handling** - More robust with special characters in table names  

---

## 🚀 Current Features

### Core Scanning
- 🔍 **Automatic Credential Detection** - Finds Supabase URLs and API keys in page source
- 📊 **Database Enumeration** - Lists all accessible tables
- 🔒 **RLS Detection** - Identifies tables without Row Level Security
- ⚠️ **Sensitive Data Detection** - Flags PII, credentials, financial data
- 📈 **Risk Scoring** - 0-100 security score with severity levels

### Data Analysis
- 🎯 **15-Row Data Preview** - See actual exposed data
- 📋 **Column Analysis** - View all exposed columns with type icons
- 🏷️ **Severity Classification** - Critical, High, Medium, Low
- 💾 **Export Options** - JSON and CSV formats

### User Experience
- 🌓 **Dark/Light Theme** - Toggle between themes
- 🎨 **Modern UI** - Clean, professional interface
- ⚡ **Fast Scanning** - Optimized performance
- 📱 **Responsive Design** - Works in any browser window size

---

## 📦 Installation

1. Download `supabase-exposure-check-v2.zip`
2. Extract the zip file
3. Open Chrome/Edge and navigate to `chrome://extensions/`
4. Enable "Developer mode" (top right)
5. Click "Load unpacked"
6. Select the extracted `supabase-exposure-check` folder
7. The extension icon will appear in your toolbar

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

### Immediate Actions:
1. **Enable RLS** on all tables with sensitive data
2. **Review policies** - Ensure they're restrictive enough
3. **Rotate keys** if service_role key is exposed
4. **Audit access logs** to see if data was accessed
5. **Update frontend** to use proper authentication

### Example Fix (SQL):
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

- **Full Documentation**: See `docs/` folder
- **Installation Guide**: `docs/INSTALLATION.md`
- **Quick Start**: `docs/QUICK-START.md`
- **Testing Guide**: `docs/TESTING-GUIDE.md`
- **Improvement Suggestions**: `IMPROVEMENT_SUGGESTIONS.md`
- **Top 5 Next Features**: `TOP_5_IMPROVEMENTS.md`

---

## 🎯 Roadmap

### Coming Soon (Priority Order):

1. **Automated Remediation** - Copy-paste SQL fixes for each vulnerability
2. **Enhanced Exports** - Detailed PDF reports with executive summaries
3. **Historical Comparison** - Track security improvements over time
4. **RLS Policy Analyzer** - Deep analysis of policy configurations
5. **Real-time Monitoring** - Background scanning with notifications

See `TOP_5_IMPROVEMENTS.md` for detailed specifications.

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

## 📈 Stats

- **Version**: 2.0
- **Last Updated**: January 31, 2026
- **Total Scans**: [Track this]
- **Vulnerabilities Found**: [Track this]
- **Active Users**: [Track this]

---

## 🌟 Star History

If you find this tool useful, please star the repository!

---

**Made with ❤️ for the Supabase community**
