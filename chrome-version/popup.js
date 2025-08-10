/* Popup script for Super Highlighter */

class PopupManager {
  constructor() {
    this.currentTab = null;
    this.highlights = [];
    this.selectedColor = 'yellow';
    this.currentFilter = 'all';
    this.settings = {
      theme: 'light',
      highlightStyle: 'smooth',
      opacity: 25,
      borderRadius: 6,
      autoSave: true,
      crossPage: true,
      showTooltip: true,
      soundEffects: false,
      animationEffects: true,
      maxHighlights: 100,
      autoSaveInterval: 3,
      customColors: {
        yellow: '#ffff00',
        green: '#90EE90',
        blue: '#87CEEB',
        red: '#FFB6C1'
      },
      shortcuts: {
        yellow: { modifier: 'ctrl+shift', key: 'Y' },
        green: { modifier: 'ctrl+shift', key: 'G' },
        blue: { modifier: 'ctrl+shift', key: 'B' },
        red: { modifier: 'ctrl+shift', key: 'R' },
        remove: { modifier: 'ctrl+shift', key: 'X' }
      }
    };
    this.init();
  }

  async init() {
    console.log('🖍️ Popup initializing...');
    
    // Get current tab
    try {
      const tabs = await chrome.tabs.query({active: true, currentWindow: true});
      this.currentTab = tabs[0];
      console.log('📋 Current tab:', this.currentTab.url);
      
      // Check if this is a special page where content scripts can't run
      if (this.currentTab.url.startsWith('chrome://') || 
          this.currentTab.url.startsWith('chrome-extension://') ||
          this.currentTab.url.startsWith('edge://') ||
          this.currentTab.url.startsWith('about:')) {
        console.log('⚠️ Special page detected, limited functionality');
        this.showSpecialPageWarning();
        return;
      }
      
    } catch (error) {
      console.error('❌ Error getting current tab:', error);
      return;
    }

    // Ensure content script is loaded
    await this.ensureContentScriptLoaded();

    // Load settings and highlights
    await this.loadSettings();
    await this.loadHighlights();

    // Setup event listeners
    this.setupEventListeners();

    // Update UI
    this.updateUI();
    
    // Send current custom colors to content script
    await this.sendCustomColorsToContentScript();
    
    console.log('✅ Popup initialized successfully');
  }

  showSpecialPageWarning() {
    const warningDiv = document.createElement('div');
    warningDiv.innerHTML = `
      <div style="padding: 15px; background: #fff3cd; color: #856404; border-radius: 4px; margin: 10px; text-align: center;">
        ⚠️ <strong>Special Page Detected</strong><br>
        This extension cannot highlight text on Chrome system pages.<br>
        Please navigate to a regular website to use highlighting features.
      </div>
    `;
    document.body.prepend(warningDiv);
  }

  async ensureContentScriptLoaded() {
    try {
      // First try to ping the content script
      const pingResponse = await chrome.tabs.sendMessage(this.currentTab.id, {action: 'ping'});
      if (pingResponse && pingResponse.status === 'alive') {
        console.log('✅ Content script is alive and responding');
        return;
      }
    } catch (pingError) {
      console.log('📋 Content script ping failed, checking DOM injection...');
    }

    try {
      // Check if content script is already loaded via DOM injection
      const result = await chrome.scripting.executeScript({
        target: { tabId: this.currentTab.id },
        func: () => window.superHighlighterLoaded === true
      });
      
      if (result[0]?.result) {
        console.log('✅ Content script found in DOM but not responding to messages');
        // Try to re-inject to fix messaging
      } else {
        console.log('📋 Content script not found, injecting...');
      }
    } catch (error) {
      console.log('📋 DOM check failed, proceeding with injection...');
    }

    try {
      console.log('� Injecting content script...');
      
      // Inject content script
      await chrome.scripting.executeScript({
        target: { tabId: this.currentTab.id },
        files: ['content.js']
      });
      
      // Inject CSS
      await chrome.scripting.insertCSS({
        target: { tabId: this.currentTab.id },
        files: ['highlight.css']
      });
      
      // Wait a bit for the script to initialize
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('✅ Content script injected successfully');
      
      // Verify injection worked with ping
      try {
        const verifyResponse = await chrome.tabs.sendMessage(this.currentTab.id, {action: 'ping'});
        if (verifyResponse && verifyResponse.status === 'alive') {
          console.log('✅ Content script injection verified');
        } else {
          console.warn('⚠️ Content script injected but not responding');
        }
      } catch (verifyError) {
        console.warn('⚠️ Content script verification failed:', verifyError);
      }
      
    } catch (injectError) {
      console.error('❌ Error injecting content script:', injectError);
      // Show user-friendly error
      this.showInjectionError();
    }
  }

  showInjectionError() {
    const errorDiv = document.createElement('div');
    errorDiv.innerHTML = `
      <div style="padding: 10px; background: #ffebee; color: #c62828; border-radius: 4px; margin: 10px;">
        ⚠️ Extension cannot work on this page. Try refreshing the page or navigate to a different website.
      </div>
    `;
    document.body.prepend(errorDiv);
  }

  async sendCustomColorsToContentScript() {
    try {
      await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'update-custom-colors',
        colors: this.settings.customColors
      });
      console.log('🎨 Custom colors sent to content script:', this.settings.customColors);
    } catch (error) {
      console.warn('⚠️ Could not send custom colors to current page. This is normal for special pages like chrome:// or extension pages.');
    }
  }

  setupEventListeners() {
    // Tab navigation
    const tabButtons = document.querySelectorAll('.tab-btn');
    console.log('🔍 Found tab buttons:', tabButtons.length);
    
    tabButtons.forEach((btn, index) => {
      console.log(`🔘 Tab button ${index}:`, btn.dataset.tab);
      btn.addEventListener('click', (e) => {
        console.log('🔄 Tab button clicked:', e.currentTarget.dataset.tab);
        this.switchTab(e.currentTarget.dataset.tab);
      });
    });

    // Toggle switch
    const enableToggle = document.getElementById('enableToggle');
    enableToggle.addEventListener('change', (e) => {
      this.toggleExtension(e.target.checked);
    });

    // Color selection
    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.selectColor(e.currentTarget.dataset.color);
      });
    });

    // Export/Import buttons
    document.getElementById('exportBtn')?.addEventListener('click', () => {
      this.exportHighlights();
    });

    document.getElementById('clearAllBtn')?.addEventListener('click', () => {
      this.clearAllHighlights();
    });

    // Settings controls
    document.getElementById('themeSelect')?.addEventListener('change', (e) => {
      this.updateSetting('theme', e.target.value);
    });

    document.getElementById('highlightStyle')?.addEventListener('change', (e) => {
      this.updateSetting('highlightStyle', e.target.value);
    });

    document.getElementById('opacity')?.addEventListener('input', (e) => {
      this.updateSetting('opacity', parseInt(e.target.value));
      document.getElementById('opacityValue').textContent = e.target.value + '%';
    });

    document.getElementById('borderRadius')?.addEventListener('input', (e) => {
      this.updateSetting('borderRadius', parseInt(e.target.value));
      document.getElementById('borderRadiusValue').textContent = e.target.value + 'px';
    });

    document.getElementById('autoSave')?.addEventListener('change', (e) => {
      this.updateSetting('autoSave', e.target.checked);
    });

    document.getElementById('crossPage')?.addEventListener('change', (e) => {
      this.updateSetting('crossPage', e.target.checked);
    });

    document.getElementById('showTooltip')?.addEventListener('change', (e) => {
      this.updateSetting('showTooltip', e.target.checked);
    });

    document.getElementById('soundEffects')?.addEventListener('change', (e) => {
      this.updateSetting('soundEffects', e.target.checked);
    });

    document.getElementById('animationEffects')?.addEventListener('change', (e) => {
      this.updateSetting('animationEffects', e.target.checked);
    });

    document.getElementById('maxHighlights')?.addEventListener('change', (e) => {
      this.updateSetting('maxHighlights', parseInt(e.target.value));
    });

    document.getElementById('autoSaveInterval')?.addEventListener('change', (e) => {
      this.updateSetting('autoSaveInterval', parseInt(e.target.value));
    });

    // Color customization
    ['yellow', 'green', 'blue', 'red'].forEach(color => {
      document.getElementById(`${color}Color`)?.addEventListener('change', (e) => {
        this.updateCustomColor(color, e.target.value);
      });
      
      document.querySelector(`[data-color="${color}"].reset-color-btn`)?.addEventListener('click', () => {
        this.resetCustomColor(color);
      });
    });

    document.getElementById('resetAllColors')?.addEventListener('click', () => {
      this.resetAllColors();
    });

    document.getElementById('randomColors')?.addEventListener('click', () => {
      this.randomizeColors();
    });

    // Search and Filter Event Listeners
    document.getElementById('searchInput')?.addEventListener('input', (e) => {
      this.filterHighlights(e.target.value, this.currentFilter);
    });

    document.getElementById('clearSearch')?.addEventListener('click', () => {
      document.getElementById('searchInput').value = '';
      this.filterHighlights('', this.currentFilter);
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.setColorFilter(e.currentTarget.dataset.filter);
      });
    });

    // Shortcut customization
    ['yellow', 'green', 'blue', 'red', 'remove'].forEach(action => {
      document.getElementById(`${action}Modifier`)?.addEventListener('change', (e) => {
        this.updateShortcut(action, 'modifier', e.target.value);
      });
      
      document.getElementById(`${action}Key`)?.addEventListener('input', (e) => {
        const key = e.target.value.toUpperCase();
        e.target.value = key;
        this.updateShortcut(action, 'key', key);
      });
    });

    document.getElementById('resetShortcuts')?.addEventListener('click', () => {
      this.resetShortcuts();
    });

    document.getElementById('testShortcuts')?.addEventListener('click', () => {
      this.testShortcuts();
    });

    // Data management buttons
    document.getElementById('importBtn')?.addEventListener('click', () => {
      this.importData();
    });

    document.getElementById('exportAllBtn')?.addEventListener('click', () => {
      this.exportAllData();
    });

    document.getElementById('resetSettingsBtn')?.addEventListener('click', () => {
      this.resetSettings();
    });
  }

  switchTab(tabName) {
    console.log('🔄 Switching to tab:', tabName);
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    // Load settings if switching to settings tab
    if (tabName === 'settings') {
      this.updateSettingsUI();
    }
    
    console.log('✅ Tab switch completed:', tabName);
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.local.get('highlighter_settings');
      if (result.highlighter_settings) {
        this.settings = { ...this.settings, ...result.highlighter_settings };
      }
      console.log('📥 Settings loaded:', this.settings);
    } catch (error) {
      console.error('❌ Error loading settings:', error);
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.local.set({ highlighter_settings: this.settings });
      console.log('💾 Settings saved:', this.settings);
    } catch (error) {
      console.error('❌ Error saving settings:', error);
    }
  }

  async updateSetting(key, value) {
    this.settings[key] = value;
    await this.saveSettings();
    
    // Apply setting immediately to content script
    try {
      switch(key) {
        case 'theme':
          this.applyTheme(value);
          break;
        case 'opacity':
          await chrome.tabs.sendMessage(this.currentTab.id, {
            action: 'update-opacity',
            opacity: value
          });
          break;
        case 'borderRadius':
          await chrome.tabs.sendMessage(this.currentTab.id, {
            action: 'update-border-radius',
            borderRadius: value
          });
          break;
        case 'highlightStyle':
          await chrome.tabs.sendMessage(this.currentTab.id, {
            action: 'update-highlight-style',
            style: value
          });
          break;
        case 'theme':
          this.applyTheme(value);
          break;
        case 'showTooltip':
        case 'soundEffects':
        case 'animationEffects':
        case 'maxHighlights':
        case 'autoSaveInterval':
        case 'autoSave':
        case 'crossPage':
          await chrome.tabs.sendMessage(this.currentTab.id, {
            action: 'update-setting',
            key: key,
            value: value
          });
          break;
      }
    } catch (error) {
      console.warn(`Could not apply setting ${key} to current page:`, error);
    }
    
    console.log(`⚙️ Setting updated: ${key} = ${value}`);
  }

  applyTheme(theme) {
    console.log('🎨 Applying theme:', theme);
    
    // Remove existing theme classes
    document.body.classList.remove('theme-light', 'theme-dark', 'theme-auto');
    
    // Apply new theme
    if (theme === 'auto') {
      // Use system preference
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.body.classList.add(isDark ? 'theme-dark' : 'theme-light');
    } else {
      document.body.classList.add(`theme-${theme}`);
    }
  }

  updateSettingsUI() {
    // Apply current theme
    this.applyTheme(this.settings.theme);
    
    // Update theme select
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) themeSelect.value = this.settings.theme;

    // Update highlight style select
    const styleSelect = document.getElementById('highlightStyle');
    if (styleSelect) styleSelect.value = this.settings.highlightStyle;

    // Update opacity slider
    const opacitySlider = document.getElementById('opacity');
    const opacityValue = document.getElementById('opacityValue');
    if (opacitySlider) {
      opacitySlider.value = this.settings.opacity;
      if (opacityValue) opacityValue.textContent = this.settings.opacity + '%';
    }

    // Update border radius slider
    const borderRadiusSlider = document.getElementById('borderRadius');
    const borderRadiusValue = document.getElementById('borderRadiusValue');
    if (borderRadiusSlider) {
      borderRadiusSlider.value = this.settings.borderRadius;
      if (borderRadiusValue) borderRadiusValue.textContent = this.settings.borderRadius + 'px';
    }

    // Update checkboxes
    const autoSaveCheck = document.getElementById('autoSave');
    if (autoSaveCheck) autoSaveCheck.checked = this.settings.autoSave;

    const crossPageCheck = document.getElementById('crossPage');
    if (crossPageCheck) crossPageCheck.checked = this.settings.crossPage;

    const showTooltipCheck = document.getElementById('showTooltip');
    if (showTooltipCheck) showTooltipCheck.checked = this.settings.showTooltip;

    const soundEffectsCheck = document.getElementById('soundEffects');
    if (soundEffectsCheck) soundEffectsCheck.checked = this.settings.soundEffects;

    const animationEffectsCheck = document.getElementById('animationEffects');
    if (animationEffectsCheck) animationEffectsCheck.checked = this.settings.animationEffects;

    // Update number inputs
    const maxHighlightsInput = document.getElementById('maxHighlights');
    if (maxHighlightsInput) maxHighlightsInput.value = this.settings.maxHighlights;

    const autoSaveIntervalInput = document.getElementById('autoSaveInterval');
    if (autoSaveIntervalInput) autoSaveIntervalInput.value = this.settings.autoSaveInterval;

    // Update custom colors
    for (const [colorName, colorValue] of Object.entries(this.settings.customColors)) {
      const colorInput = document.getElementById(`${colorName}Color`);
      if (colorInput) colorInput.value = colorValue;

      // Update color button
      const colorBtn = document.querySelector(`[data-color="${colorName}"]`);
      if (colorBtn) colorBtn.style.background = colorValue;
    }

    // Update shortcuts
    this.updateShortcutsUI();
  }

  async updateHighlightOpacity(opacity) {
    try {
      await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'update-opacity',
        opacity: opacity
      });
    } catch (error) {
      console.warn('Could not update opacity on current page:', error);
    }
  }

  async toggleExtension(enabled) {
    try {
      await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'toggle-enabled',
        enabled: enabled
      });
      console.log('🔧 Extension toggled:', enabled);
    } catch (error) {
      console.error('❌ Error toggling extension:', error);
    }
  }

  selectColor(color) {
    this.selectedColor = color;
    
    // Update UI
    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-color="${color}"]`).classList.add('active');
    
    console.log('🎨 Color selected:', color);
    
    // Send to content script for auto-highlighting
    this.sendColorToContentScript(color);
  }

  async sendColorToContentScript(color) {
    try {
      await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'set-color',
        color: color
      });
    } catch (error) {
      console.error('❌ Error sending color to content script:', error);
    }
  }

  async loadHighlights() {
    try {
      // First try to load from storage directly
      const urlKey = this.getUrlKey(this.currentTab.url);
      const result = await chrome.storage.local.get(urlKey);
      
      if (result[urlKey]) {
        this.highlights = result[urlKey];
        console.log('📥 Highlights loaded from storage:', this.highlights.length);
        return;
      }
      
      // If no storage data, try to get from content script
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'get-highlights'
      });
      
      if (response && response.highlights) {
        this.highlights = response.highlights;
        console.log('📥 Highlights loaded from content script:', this.highlights.length);
      } else {
        this.highlights = [];
      }
    } catch (error) {
      console.warn('⚠️ Could not load highlights from current page. Using fallback methods.');
      
      // Check if it's a context invalidation error
      if (error.message && error.message.includes('Extension context invalidated')) {
        console.log('🔄 Extension context invalidated in popup');
        this.showContextInvalidationMessage();
      }
      
      // Storage fallback
      try {
        const urlKey = this.getUrlKey(this.currentTab.url);
        const result = await chrome.storage.local.get(urlKey);
        this.highlights = result[urlKey] || [];
        console.log('📥 Highlights loaded from storage fallback:', this.highlights.length);
      } catch (storageError) {
        console.error('❌ Storage fallback failed:', storageError);
        
        // Try emergency backup from localStorage
        try {
          const emergencyKey = 'ssh_emergency_' + this.getUrlKey(this.currentTab.url);
          const backup = localStorage.getItem(emergencyKey);
          if (backup) {
            const backupData = JSON.parse(backup);
            this.highlights = backupData.highlights || [];
            console.log('📥 Highlights loaded from emergency backup:', this.highlights.length);
          } else {
            this.highlights = [];
          }
        } catch (emergencyError) {
          console.error('❌ Emergency backup failed:', emergencyError);
          this.highlights = [];
        }
      }
    }
  }

  showContextInvalidationMessage() {
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
      background: #ff5722;
      color: white;
      padding: 12px;
      margin: 10px;
      border-radius: 6px;
      font-size: 13px;
      text-align: center;
      line-height: 1.4;
    `;
    
    messageDiv.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 6px;">⚠️ Extension Context Issue</div>
      <div style="font-size: 11px;">Please reload the extension and refresh the page</div>
    `;
    
    // Insert at the top of popup
    const popup = document.body;
    popup.insertBefore(messageDiv, popup.firstChild);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.remove();
      }
    }, 10000);
  }

  getUrlKey(url) {
    try {
      const urlObj = new URL(url);
      return 'highlights_' + btoa(urlObj.hostname + urlObj.pathname).replace(/[^a-zA-Z0-9]/g, '');
    } catch (e) {
      return 'highlights_' + btoa(url).replace(/[^a-zA-Z0-9]/g, '');
    }
  }

  updateUI() {
    this.updateHighlightsList();
    this.updateHighlightCount();
    this.updateSettingsUI();
  }

  updateHighlightCount() {
    const countBadge = document.getElementById('highlightCount');
    if (countBadge) {
      countBadge.textContent = this.highlights.length;
    }
  }

  updateHighlightsList(filteredHighlights = null) {
    const highlightsList = document.getElementById('highlightsList');
    if (!highlightsList) return;

    // Use filtered highlights if provided, otherwise use all highlights
    const displayHighlights = filteredHighlights !== null ? filteredHighlights : this.highlights;

    if (displayHighlights.length === 0) {
      const isFiltered = filteredHighlights !== null && this.highlights.length > 0;
      highlightsList.innerHTML = `
        <div class="no-highlights">
          ${isFiltered ? 
            '<p>No highlights found matching your search criteria.</p><p>Clear the search to see all highlights.</p>' :
            '<p>No highlights yet.</p><p>Select text and use color buttons to highlight!</p>'
          }
        </div>
      `;
      return;
    }

    const highlightsHTML = displayHighlights.map((highlight, index) => {
      // Find the original index in the full highlights array
      const originalIndex = this.highlights.findIndex(h => h.id === highlight.id);
      
      return `
        <div class="highlight-item" data-highlight-id="${highlight.id}" data-color="${highlight.color}">
          <div class="highlight-text ssh-${highlight.color}">
            ${this.truncateText(highlight.text, 50)}
          </div>
          <div class="highlight-actions">
            <button class="highlight-action-btn navigate" data-action="navigate" data-index="${originalIndex}" title="Git">
              🔍
            </button>
            <button class="highlight-action-btn remove" data-action="remove" data-highlight-id="${highlight.id}" title="Sil">
              🗑️
            </button>
          </div>
        </div>
      `;
    }).join('');

    highlightsList.innerHTML = highlightsHTML;
    
    // Add event listeners to action buttons
    this.setupHighlightActionListeners();
  }

  setupHighlightActionListeners() {
    // Remove any existing listeners first
    document.querySelectorAll('.highlight-action-btn').forEach(btn => {
      btn.replaceWith(btn.cloneNode(true));
    });
    
    // Add new listeners
    document.querySelectorAll('.highlight-action-btn[data-action="navigate"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const index = parseInt(btn.dataset.index);
        this.navigateToHighlight(index);
      });
    });
    
    document.querySelectorAll('.highlight-action-btn[data-action="remove"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const highlightId = btn.dataset.highlightId;
        this.removeHighlight(highlightId);
      });
    });
  }

  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  async navigateToHighlight(index) {
    try {
      await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'navigate-to-highlight',
        index: index
      });
      window.close();
    } catch (error) {
      console.error('❌ Error navigating to highlight:', error);
    }
  }

  async removeHighlight(highlightId) {
    try {
      await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'remove-highlight-by-id',
        highlightId: highlightId
      });
      
      // Update local highlights
      this.highlights = this.highlights.filter(h => h.id !== highlightId);
      
      // Reapply current filter after removal
      const searchTerm = document.getElementById('searchInput')?.value || '';
      this.filterHighlights(searchTerm, this.currentFilter);
      
      // Update count badge
      const countBadge = document.getElementById('highlightCount');
      if (countBadge) {
        countBadge.textContent = this.highlights.length;
      }
      
      console.log('🗑️ Highlight removed:', highlightId);
    } catch (error) {
      console.error('❌ Error removing highlight:', error);
    }
  }

  // Search and Filter Functions
  filterHighlights(searchTerm = '', colorFilter = 'all') {
    let filtered = this.highlights;

    // Apply text search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(highlight => 
        highlight.text.toLowerCase().includes(searchLower)
      );
    }

    // Apply color filter
    if (colorFilter !== 'all') {
      filtered = filtered.filter(highlight => highlight.color === colorFilter);
    }

    // Update the display
    this.updateHighlightsList(filtered);
    
    console.log(`🔍 Filtered ${filtered.length} of ${this.highlights.length} highlights (search: "${searchTerm}", color: ${colorFilter})`);
  }

  setColorFilter(color) {
    // Update filter button states
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    document.querySelector(`[data-filter="${color}"]`)?.classList.add('active');
    
    // Store current filter
    this.currentFilter = color;
    
    // Apply filter with current search term
    const searchTerm = document.getElementById('searchInput')?.value || '';
    this.filterHighlights(searchTerm, color);
  }

  clearAllFilters() {
    // Clear search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.value = '';
    }
    
    // Reset filter to 'all'
    this.setColorFilter('all');
  }

  exportHighlights() {
    if (this.highlights.length === 0) {
      alert('No highlights to export.');
      return;
    }

    const data = {
      url: this.currentTab.url,
      highlights: this.highlights,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `highlights_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    console.log('📤 Highlights exported');
  }

  async clearAllHighlights() {
    if (this.highlights.length === 0) {
      alert('No highlights to delete.');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${this.highlights.length} highlights?`)) {
      return;
    }

    try {
      // Clear from content script
      await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'clear-all-highlights'
      });
      
      // Update local state
      this.highlights = [];
      this.updateUI();
      
      console.log('🗑️ All highlights cleared');
    } catch (error) {
      console.error('❌ Error clearing highlights:', error);
    }
  }

  async importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target.result);
          
          if (data.highlights && Array.isArray(data.highlights)) {
            // Import highlights to current page
            await chrome.tabs.sendMessage(this.currentTab.id, {
              action: 'import-highlights',
              highlights: data.highlights
            });
            
            // Refresh highlights list
            await this.loadHighlights();
            this.updateUI();
            
            alert(`${data.highlights.length} highlights imported successfully.`);
            console.log('📥 Highlights imported:', data.highlights.length);
          } else {
            alert('Invalid file format.');
          }
        } catch (error) {
          console.error('❌ Error importing highlights:', error);
          alert('File reading error.');
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  }

  async exportAllData() {
    try {
      const allData = await chrome.storage.local.get(null);
      
      const exportData = {
        settings: this.settings,
        allHighlights: allData,
        exportDate: new Date().toISOString(),
        version: '1.0.0'
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `super_highlighter_backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      URL.revokeObjectURL(url);
      console.log('📤 All data exported');
    } catch (error) {
      console.error('❌ Error exporting all data:', error);
      alert('Export error.');
    }
  }

  async resetSettings() {
    if (!confirm('Are you sure you want to reset all settings to default values?')) {
      return;
    }

    this.settings = {
      theme: 'light',
      highlightStyle: 'smooth',
      opacity: 25,
      autoSave: true,
      crossPage: true
    };

    await this.saveSettings();
    this.updateSettingsUI();
    
    alert('Settings reset to default values.');
    console.log('🔄 Settings reset to defaults');
  }

  // Color customization functions
  async updateCustomColor(colorName, colorValue) {
    this.settings.customColors[colorName] = colorValue;
    await this.saveSettings();
    
    // Update color button
    const colorBtn = document.querySelector(`[data-color="${colorName}"]`);
    if (colorBtn) {
      colorBtn.style.background = colorValue;
    }
    
    // Send updated colors to content script
    try {
      await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'update-custom-colors',
        colors: this.settings.customColors
      });
    } catch (error) {
      console.warn('Could not send color update to current page:', error);
    }
    
    console.log(`🎨 Custom color updated: ${colorName} = ${colorValue}`);
  }

  async resetCustomColor(colorName) {
    const defaultColors = {
      yellow: '#ffff00',
      green: '#90EE90',
      blue: '#87CEEB',
      red: '#FFB6C1'
    };
    
    await this.updateCustomColor(colorName, defaultColors[colorName]);
    document.getElementById(`${colorName}Color`).value = defaultColors[colorName];
  }

  async resetAllColors() {
    const defaultColors = {
      yellow: '#ffff00',
      green: '#90EE90',
      blue: '#87CEEB',
      red: '#FFB6C1'
    };
    
    for (const [colorName, colorValue] of Object.entries(defaultColors)) {
      await this.updateCustomColor(colorName, colorValue);
      document.getElementById(`${colorName}Color`).value = colorValue;
    }
    
    alert('All colors reset to default values.');
  }

  async randomizeColors() {
    const getRandomColor = () => {
      const letters = '0123456789ABCDEF';
      let color = '#';
      for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
      }
      return color;
    };
    
    const colors = ['yellow', 'green', 'blue', 'red'];
    for (const colorName of colors) {
      const randomColor = getRandomColor();
      await this.updateCustomColor(colorName, randomColor);
      document.getElementById(`${colorName}Color`).value = randomColor;
    }
    
    alert('Rastgele renkler uygulandı!');
  }

  // Shortcut customization functions
  async updateShortcut(action, type, value) {
    this.settings.shortcuts[action][type] = value;
    await this.saveSettings();
    
    // Send to content script
    this.sendShortcutUpdate();
    console.log(`⌨️ Shortcut updated: ${action}.${type} = ${value}`);
  }

  async resetShortcuts() {
    const defaultShortcuts = {
      yellow: { modifier: 'ctrl+shift', key: 'Y' },
      green: { modifier: 'ctrl+shift', key: 'G' },
      blue: { modifier: 'ctrl+shift', key: 'B' },
      red: { modifier: 'ctrl+shift', key: 'R' },
      remove: { modifier: 'ctrl+shift', key: 'X' }
    };
    
    this.settings.shortcuts = defaultShortcuts;
    await this.saveSettings();
    this.updateShortcutsUI();
    this.sendShortcutUpdate();
    
    alert('Kısayollar varsayılan değerlere döndürüldü.');
  }

  updateShortcutsUI() {
    for (const [action, shortcut] of Object.entries(this.settings.shortcuts)) {
      const modifierSelect = document.getElementById(`${action}Modifier`);
      const keyInput = document.getElementById(`${action}Key`);
      
      if (modifierSelect) modifierSelect.value = shortcut.modifier;
      if (keyInput) keyInput.value = shortcut.key;
    }
  }

  async sendShortcutUpdate() {
    try {
      await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'update-shortcuts',
        shortcuts: this.settings.shortcuts
      });
    } catch (error) {
      console.warn('Could not send shortcut update to current page:', error);
    }
  }

  testShortcuts() {
    let message = 'Mevcut Kısayollar:\n\n';
    for (const [action, shortcut] of Object.entries(this.settings.shortcuts)) {
      const actionName = {
        yellow: 'Sarı',
        green: 'Yeşil',
        blue: 'Mavi',
        red: 'Kırmızı',
        remove: 'Kaldır'
      }[action];
      
      const modifierText = shortcut.modifier.replace('+', '+').split('+').map(key => 
        key.charAt(0).toUpperCase() + key.slice(1)
      ).join('+');
      
      message += `${actionName}: ${modifierText}+${shortcut.key}\n`;
    }
    
    message += '\nBu kısayolları test etmek için popup\'ı kapatın ve sayfada deneyin.';
    alert(message);
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Small delay to ensure DOM is fully ready
  setTimeout(() => {
    window.popupManager = new PopupManager();
    console.log('🎯 PopupManager initialized and available globally');
  }, 50);
});

// Make functions globally available for onclick handlers
window.popupManager = null;
