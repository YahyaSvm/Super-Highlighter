# Super-Highlighter — Professional Text Highlighting WebExtension for Firefox

Super-Highlighter is a professional, privacy-focused WebExtension built specifically for Mozilla Firefox. It enables users to highlight and annotate text on any webpage with persistent, customizable, and easily manageable highlights. Designed for researchers, students, and productivity enthusiasts seeking seamless knowledge management directly in their browser.

---

## 🏆 Features

- **Advanced Text Highlighting:**  
  Instantly highlight selected text in multiple customizable colors.
- **Annotations:**  
  Add contextual notes to any highlight for deeper understanding.
- **Persistent Local Storage:**  
  Highlights and notes are stored securely in your browser—no cloud or third-party servers.
- **Centralized Highlight Management:**  
  View, edit, search, and delete all your highlights from a dedicated dashboard popup.
- **Multi-Color & Custom Styles:**  
  Select from preset colors or define your own for accessibility and clarity.
- **Keyboard Shortcuts:**  
  Configure hotkeys for lightning-fast highlighting and annotation.
- **Dynamic Content Support:**  
  Reliable highlighting even on modern, JavaScript-heavy or frequently changing webpages.
- **Minimal Permissions & Privacy:**  
  No analytics, tracking, or unnecessary permissions.

---

## 🌐 Browser & Technology

| Browser  | Support   |
|----------|-----------|
| ![Firefox Icon](https://raw.githubusercontent.com/alrra/browser-logos/main/src/firefox/firefox_32x32.png) **Firefox** | 100% ✔️ (fully supported and recommended) |
| ![Chrome Icon](https://raw.githubusercontent.com/alrra/browser-logos/main/src/chrome/chrome_32x32.png) **Chrome** | Experimental (not officially maintained) |

- **Primary Language:** JavaScript (ES6+)
- **UI & Styles:** HTML5, CSS3
- **Extension Type:** [WebExtension API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- **Icons:** Provided in `/icons` directory

---

## 🚀 Installation

### For Firefox Users

#### Option 1: Load as Temporary Add-on (Development/Evaluation)

1. **Download the Source Code:**
   - Clone this repository or click "Code → Download ZIP" and extract.
   ```bash
   git clone https://github.com/YahyaSvm/Super-Highlighter.git
   ```

2. **Open Firefox and Navigate to Add-on Debugging:**
   - Enter `about:debugging#/runtime/this-firefox` in the address bar.

3. **Load the Extension:**
   - Click **"Load Temporary Add-on..."**.
   - Select the `manifest.json` file from the extracted folder.

4. **Use the Extension:**
   - The Super-Highlighter icon should now appear in your Firefox toolbar.
   - Temporary add-ons are removed when you restart Firefox. For persistent usage, see the next option.

#### Option 2: Build and Install as a Permanent Add-on (Advanced/Recommended for Regular Use)

1. **Package the Extension:**
   - (Optional) Install [web-ext](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/) for building/testing:
     ```bash
     npm install --global web-ext
     ```
   - In the extension directory:
     ```bash
     web-ext build
     ```
   - This creates a `.zip` file in the `web-ext-artifacts/` directory.

2. **Install the Package:**
   - Go to `about:addons` in Firefox.
   - Click the gear icon → "Install Add-on From File..."
   - Select the generated `.zip` file.

3. **Automatic Reloading (Development):**
   - Instead of manual reload, use:
     ```bash
     web-ext run
     ```
   - This launches a new Firefox window with the extension auto-loaded and auto-reloads on code changes.

#### Option 3: From AMO (When Available)
- Once published, simply visit [Firefox Add-ons](https://addons.mozilla.org/) and search for “Super-Highlighter” for one-click installation and automatic updates.

---

### ⚠️ Troubleshooting & Notes

- **Permissions:**  
  If you receive permission warnings, review them—Super-Highlighter only requests what's absolutely necessary for functionality.
- **Persistence:**  
  Temporary add-ons are cleared when Firefox is restarted. Use permanent installation for uninterrupted use.
- **Updates:**  
  If you update the source code, reload the extension via `about:debugging` or re-install the updated package.
- **Other Browsers:**  
  Chrome and Chromium-based browser support is experimental and not officially maintained.

---

## 💡 How to Use

1. **Highlight Text:**  
   - Select the desired text on any webpage.
   - Right-click and select **"Highlight with Super-Highlighter"** or use the extension popup.

2. **Add Annotations:**  
   - After highlighting, add a note in the popup interface.

3. **Manage Highlights:**  
   - Click the extension icon to open the dashboard.
   - Edit, delete, or search your highlights and annotations.

4. **Customize Settings:**  
   - From the popup settings, adjust highlight colors, annotation styles, and shortcuts.

---

## 🗂️ Project Structure

```
Super-Highlighter/
├── background.js      # Handles background events, context menus
├── content.js         # Injected into pages for highlighting logic
├── highlight.css      # Highlight/annotation styles
├── popup.html         # Main popup UI
├── popup.js           # Popup logic and dashboard management
├── popup.css          # Popup styling
├── manifest.json      # Firefox WebExtension manifest
├── icons/             # Extension and toolbar icons
├── LICENSE            # MIT License
└── README.md          # Project documentation
```

---

## ⚙️ Configuration & Customization

- **Highlight Colors:**  
  Choose default and custom highlight colors in the settings panel.
- **Annotation Options:**  
  Enable/disable annotations or configure appearance.
- **Shortcuts:**  
  Set or customize keyboard shortcuts via Firefox's extension shortcut settings.

---

## 👨‍💻 Contribution

Contributions are highly encouraged!  
- Fork the repository and create feature branches.
- Document your code and follow clean coding standards.
- Submit pull requests with clear descriptions.

For bug reports or feature requests, [open an issue](https://github.com/YahyaSvm/Super-Highlighter/issues).

---

## 🔒 Privacy & Security

- **No tracking or data collection.**
- **No unnecessary permissions.**
- **Completely open source and auditable.**

---

## 📝 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

## 💬 Contact & Support

- Questions or feedback? [Open an issue](https://github.com/YahyaSvm/Super-Highlighter/issues)
- Author: [YahyaSvm](https://github.com/YahyaSvm)

---

> **Super-Highlighter** — Your professional, private, and powerful tool for web research, reading, and productivity, built for Firefox.