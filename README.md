# 🎯 Supabase Exposure Check Extension

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Chrome](https://img.shields.io/badge/Chrome-Extension-orange.svg)

> **Stop security leaks before they happen.** Automatically scan websites for exposed Supabase JWT tokens, enumerate accessible tables, and identify sensitive data leakage.

---

## ⚡ Key Features

| Feature | Description |
| :--- | :--- |
| **🔍 Smart Detection** | Scans external & inline JS files for Supabase Project URLs and JWTs. |
| **🛡️ Security Audit** | Attempts to enumerate tables and sample data to identify PII, Credentials, and Secrets. |
| **🎨 Modern UI** | Beautiful, interactive dashboard with **Dark Mode** support. |
| **📊 Detailed Reports** | Export your findings instantly to **JSON** or **CSV** formats. |
| **📋 Quick Actions** | One-click "Copy to Clipboard" for discovered credentials. |
| **🔦 Advanced Filtering** | Search through discovered tables and filter by severity levels. |

---

## 📸 Preview

*(Add your screenshots here after uploading to GitHub)*
- [Dashboard View]
- [Vulnerability Report]
- [Dark Mode Toggle]

---

## 🚀 Installation (Developer Mode)

Since this is a specialized security tool, it is distributed via GitHub Releases for full transparency.

1.  **Download:** Go to the [Releases](https://github.com/YOUR_USERNAME/YOUR_REPO/releases) page and download `supabase-exposure-extension-v1.0.0.zip`.
2.  **Extract:** Unzip the downloaded file to a local folder.
3.  **Chrome Extensions:** Open Chrome and navigate to `chrome://extensions/`.
4.  **Developer Mode:** Toggle the **Developer mode** switch in the top-right corner.
5.  **Load Unpacked:** Click the **Load unpacked** button.
6.  **Select Folder:** Choose the folder where you extracted the extension.

---

## 🛠️ How to Use

1.  Navigate to any website you want to audit.
2.  Click the **Supabase Security Scanner** icon in your extension bar.
3.  Hit **Start Security Scan**.
4.  Watch the real-time log as the extension analyzes script resources and tests API endpoints.
5.  Review the categorized results (Critical, High, Medium, Safe).

---

## 🔒 Security & Privacy

- **Local Execution:** All analysis and API calls are performed directly from *your* browser.
- **No Tracking:** This extension does not track your browsing history or send data to any external servers.
- **Open Source:** Auditable code to ensure your own security while auditing others.

---

## 👨‍💻 Original Tool

This extension is based on the original Python CLI tool. You can still find the CLI version in the root directory:
```bash
python supabase-exposure-check.py --url https://example.com
```

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.