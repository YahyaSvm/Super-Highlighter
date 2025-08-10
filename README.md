# Super-Highlighter — Cross-Browser Text Highlighting Extension (Firefox Stable, Chrome In Development)

Super-Highlighter is a privacy-focused WebExtension that lets you highlight and annotate text on webpages with persistent, customizable highlights and notes. Currently stable on Firefox; a Chrome/Chromium port is under active development (beta / not yet feature-complete).

---

## 🏆 Features

- Fast multi-color text highlighting
- Inline / popup annotations (note attachments)
- Persistent local storage (no servers)
- Highlight manager (search, edit, delete)
- Custom color palette & styling
- Keyboard shortcut support
- Works on many dynamic / JavaScript-heavy pages
- Minimal permissions & zero tracking
- Open source & auditable

### In-Progress (Chrome Beta)
- Manifest V3 adaptation
- Consistent styling parity with Firefox build
- Robust re-highlighting on heavy DOM mutations
- Export / import (planned)

---

## 🌐 Browser Support

| Browser | Status |
|---------|--------|
| Firefox | Stable / Fully Supported |
| Chrome / Chromium | In Development (Beta, may have bugs) |

> Chrome support is functional for core highlighting, but some advanced behaviors (edge cases in dynamic pages, full annotation styling parity, certain shortcut flows) are still being refined.

---

## 🚀 Installation

### Firefox (Stable)
1. Clone repository:
   ```bash
   git clone https://github.com/YahyaSvm/Super-Highlighter.git
   ```
2. Open `about:debugging#/runtime/this-firefox`.
3. Click "Load Temporary Add-on" → select `manifest.json`.
4. (For persistence) Optionally build a distributable:
   ```bash
   npm install --global web-ext   # optional helper
   web-ext build
   ```
5. Install generated ZIP via `about:addons` → gear → Install Add-on From File.

### Chrome / Chromium (Beta / WIP)
1. Clone repository (same as above).
2. Open `chrome://extensions/`.
3. Enable Developer Mode.
4. Click "Load unpacked" and select the project folder.
5. Pin the extension from the toolbar.

Notes (Chrome Beta):
- Background/event behavior still tuned; reload extension if highlights fail after navigation.
- Some styling or annotation edge cases may differ from Firefox.
- Manifest is currently MV2 style; MV3 migration is planned.

---

## 💡 Usage

1. Select text → use context menu item or popup to create highlight.
2. (Optional) Add / edit an annotation via popup interface.
3. Manage existing highlights (search, edit, delete) from popup dashboard.
4. Customize colors and (where supported) shortcuts via browser extension shortcut settings.

### Shortcuts
- Firefox: `about:addons` → Manage Extension → Manage Shortcuts
- Chrome: `chrome://extensions/shortcuts`

---

## 🗂️ Project Structure
```
Super-Highlighter/
├── background.js       # Background logic (context menus, lifecycle)
├── content.js          # Injected script for selection & DOM highlighting
├── highlight.css       # Highlight & annotation visual styles
├── popup.html          # Popup / manager UI
├── popup.js            # Popup logic (render, CRUD, search)
├── popup.css           # Popup styles
├── manifest.json       # WebExtension manifest (MV2 style; MV3 planned)
├── icons/              # Icon assets (16,32,48,128 etc.)
├── LICENSE             # MIT License
└── README.md           # Documentation
```

---

## ⚙️ Configuration & Customization
- Color palette (default + custom)
- Toggle / style annotations
- Shortcut mappings (browser-level configuration)
- (Planned) Export / import of highlight sets

---

## 🧪 Chrome Beta Notes
| Aspect | Status |
|--------|--------|
| Core highlighting | Working |
| Annotations | Working (styling parity improving) |
| Re-apply after dynamic changes | Partial (mutation handling improvements planned) |
| Shortcut reliability | Basic |
| MV3 migration | Pending |

---

## ⚠️ Troubleshooting
- Highlights missing after page updates: Page may re-render; reload the tab or re-trigger highlight (mutation observer refinements in progress for Chrome).
- Icons not showing: Ensure all referenced sizes exist in `manifest.json`.
- Shortcut conflicts: Adjust via browser shortcut settings.
- Chrome errors on reload: If background script becomes inactive, remove + re-load unpacked folder.

---

## 🔒 Privacy
- No external requests
- No telemetry / analytics
- Local-only storage
- Minimal permission scope

---

## 🧩 Roadmap
- Chrome Manifest V3 migration
- Export / import (JSON)
- Sync storage option (optional)
- Advanced search filters (URL domain, date)
- PDF integration
- Theming (dark / light auto mode)

---

## 🤝 Contribution
1. Fork the repository
2. Create a feature branch:
   ```bash
   git checkout -b feat/your-feature
   ```
3. Commit clearly:
   ```bash
   git commit -m "feat: add X"
   ```
4. Open a Pull Request with description & rationale

Issues / Feature requests: https://github.com/YahyaSvm/Super-Highlighter/issues

---

## 📝 License
MIT — see `LICENSE`.

---

## 📬 Contact
Author: [YahyaSvm](https://github.com/YahyaSvm)
Feedback & bugs: GitHub Issues

---

> Super-Highlighter — Clean, private, stable on Firefox and evolving on Chrome.