/* Content script for Super Simple Highlighter */

class HighlightManager {
  constructor() {
    this.highlights = [];
    this.isEnabled = true;
    this.selectedColor = 'yellow';
    this.lastSelection = null;
    this.lastRange = null;
    this.saveTimeout = null;
    this.isLoading = false; // Add loading flag
    this.isRestoring = false; // Add restoring flag
    this.customColors = {
      yellow: '#ffff00',
      green: '#90EE90',
      blue: '#87CEEB',
      red: '#FFB6C1'
    };
    this.init();
  }

  init() {
    console.log('🖍️ Super Simple Highlighter initialized');
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.setupEventListeners();
        this.loadHighlights();
        this.updateCustomColorStyles();
      });
    } else {
      this.setupEventListeners();
      this.loadHighlights();
      this.updateCustomColorStyles();
    }
    
    // Also restore highlights when page becomes visible (tab switch, etc.)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.log('📄 Page visible again, checking highlights...');
        setTimeout(() => {
          this.restoreHighlightsIfNeeded();
        }, 500);
      }
    });
    
    // Restore highlights after navigation/reload
    window.addEventListener('load', () => {
      console.log('🔄 Page loaded, restoring highlights...');
      setTimeout(() => {
        this.restoreHighlightsIfNeeded();
      }, 1000);
    });
  }

  setupEventListeners() {
    console.log('🔧 Setting up event listeners');
    
    // Listen for messages from background script and popup
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('📨 Received message:', message);
      this.handleMessage(message, sendResponse);
      return true; // Will respond asynchronously
    });

    // Add context menu on text selection
    document.addEventListener('mouseup', (e) => {
      if (this.isEnabled) {
        this.handleTextSelection(e);
      }
    });

    // Handle clicking on existing highlights
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('ssh-highlight')) {
        e.preventDefault();
        e.stopPropagation();
        
        // Remove the clicked highlight
        const highlightId = e.target.dataset.highlightId;
        if (highlightId) {
          console.log('🗑️ Removing highlight on click:', highlightId);
          this.removeHighlightById(highlightId);
          
          // Clear any cached selection since we just removed a highlight
          this.lastSelection = null;
        }
      }
    });
    
    // Also handle double-click for extra safety
    document.addEventListener('dblclick', (e) => {
      if (e.target.classList.contains('ssh-highlight')) {
        e.preventDefault();
        e.stopPropagation();
        
        const highlightId = e.target.dataset.highlightId;
        if (highlightId) {
          console.log('🗑️ Removing highlight on double-click:', highlightId);
          this.removeHighlightById(highlightId);
          this.lastSelection = null;
        }
      }
    });

    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && this.isEnabled) {
        const key = e.key.toLowerCase();
        
        // Skip if it's just the Shift key itself
        if (key === 'shift' || key === 'control') {
          return;
        }
        
        console.log('⌨️ Keyboard shortcut detected:', `Ctrl+Shift+${key.toUpperCase()}`);
        
        switch(key) {
          case 'y':
            e.preventDefault();
            this.highlightSelection('yellow');
            break;
          case 'g':
            e.preventDefault();
            this.highlightSelection('green');
            break;
          case 'b':
            e.preventDefault();
            this.highlightSelection('blue');
            break;
          case 'r':
            e.preventDefault();
            this.highlightSelection('red');
            break;
          case 'x':
            e.preventDefault();
            this.removeHighlightFromSelection();
            break;
          default:
            console.log('🤷 Unknown keyboard shortcut:', key);
        }
      }
    });
    
    // Clear cache when user navigates or refreshes
    window.addEventListener('beforeunload', () => {
      this.lastSelection = null;
      console.log('🔄 Page unloading - clearing selection cache');
    });
    
    // Clear cache when selection changes
    document.addEventListener('selectionchange', () => {
      const selection = window.getSelection();
      if (selection.toString().trim().length === 0) {
        // Only clear if no text is selected and we're not in a tooltip interaction
        if (!document.querySelector('.ssh-tooltip')) {
          this.lastSelection = null;
        }
      }
    });
  }

  handleMessage(message, sendResponse) {
    // Reduce log noise for frequent messages
    if (message.action !== 'get-highlights' && message.action !== 'ping') {
      console.log('🔄 Handling message:', message.action);
    }
    
    try {
      switch(message.action) {
        case 'ping':
          sendResponse({ready: true, timestamp: Date.now()});
          break;
        case 'highlight':
          this.highlightSelection(message.color);
          sendResponse({success: true});
          break;
        case 'remove-highlight':
          this.removeHighlightFromSelection();
          sendResponse({success: true});
          break;
        case 'get-highlights':
          sendResponse({highlights: this.highlights});
          break;
        case 'navigate-to-highlight':
          this.navigateToHighlight(message.index);
          sendResponse({success: true});
          break;
        case 'remove-highlight-by-id':
          this.removeHighlightById(message.highlightId);
          sendResponse({success: true});
          break;
        case 'toggle-enabled':
          this.isEnabled = message.enabled;
          console.log('🔧 Extension enabled:', this.isEnabled);
          sendResponse({success: true});
          break;
        case 'set-color':
          this.selectedColor = message.color;
          console.log('🎨 Color set to:', this.selectedColor);
          
          // Check if there's a stored selection to highlight
          if (this.lastSelection && this.lastSelection.text) {
            console.log('🖍️ Auto-highlighting stored selection with new color:', this.selectedColor);
            this.highlightStoredSelection(this.lastSelection, this.selectedColor);
          } else {
            console.log('💡 No stored selection available. User needs to select text first.');
            // Show a temporary message to user
            this.showTemporaryMessage('Select text first, then choose a color from the popup!');
          }
          
          sendResponse({success: true});
          break;
        case 'update-opacity':
          this.updateHighlightOpacity(message.opacity);
          sendResponse({success: true});
          break;
        case 'update-custom-colors':
          this.customColors = { ...this.customColors, ...message.colors };
          this.updateCustomColorStyles();
          console.log('🎨 Custom colors updated:', this.customColors);
          sendResponse({success: true});
          break;
        case 'clear-all-highlights':
          this.clearAllHighlights();
          sendResponse({success: true});
          break;
        case 'import-highlights':
          this.importHighlights(message.highlights);
          sendResponse({success: true});
          break;
        case 'update-shortcuts':
          this.updateShortcuts(message.shortcuts);
          sendResponse({success: true});
          break;
        case 'update-border-radius':
          this.updateBorderRadius(message.borderRadius);
          sendResponse({success: true});
          break;
        case 'update-highlight-style':
          this.updateHighlightStyle(message.style);
          sendResponse({success: true});
          break;
        case 'update-setting':
          this.updateGeneralSetting(message.key, message.value);
          sendResponse({success: true});
          break;
        default:
          console.warn('❌ Unknown message action:', message.action);
          sendResponse({success: false, error: 'Unknown action'});
      }
    } catch (error) {
      console.error('❌ Error handling message:', error);
      sendResponse({success: false, error: error.message});
    }
  }

  handleTextSelection(e) {
    // Check if we clicked on tooltip - ignore if so
    if (e.target.closest('.ssh-tooltip')) {
      console.log('🚫 Ignoring click on tooltip');
      return;
    }

    const selection = window.getSelection();
    const selectedText = selection.toString();
    
    console.log('🖱️ Mouse up event, selected text length:', selectedText.length);
    
    if (selectedText.length > 0) {
      // Normalize whitespace for consistent storage and comparison
      const normalizedText = selectedText.replace(/\s+/g, ' ').trim();
      
      // Store the selection for later use (only if it's different from current)
      const range = selection.getRangeAt(0);
      const newSelection = {
        text: normalizedText,
        originalText: selectedText, // Keep original for debugging
        range: range.cloneRange(),
        xpath: this.getXPathForRange(range)
      };
      
      // Only update if it's a different selection (compare normalized text)
      if (!this.lastSelection || this.lastSelection.text !== newSelection.text) {
        this.lastSelection = newSelection;
        console.log('💾 Stored new selection:', this.lastSelection.text);
      } else {
        console.log('🔄 Same selection, keeping stored selection');
      }
      
      // Show a small tooltip with highlight options
      this.showHighlightTooltip(e.clientX, e.clientY, selection);
    } else {
      // Clear stored selection immediately when no text is selected
      if (!e.target.closest('.ssh-tooltip')) {
        console.log('🗑️ Clearing stored selection - no text selected');
        this.lastSelection = null;
        this.removeTooltip();
      }
    }
  }

  showHighlightTooltip(x, y, selection) {
    // Check if tooltip is disabled
    if (this.showTooltipEnabled === false) {
      return;
    }
    
    // Remove existing tooltip
    this.removeTooltip();

    const tooltip = document.createElement('div');
    tooltip.className = 'ssh-tooltip';
    
    // Build color buttons with dynamic colors
    const colorButtons = [
      { key: 'yellow', label: 'Y', title: 'Sarı (Ctrl+Shift+Y)' },
      { key: 'green', label: 'G', title: 'Yeşil (Ctrl+Shift+G)' },
      { key: 'blue', label: 'B', title: 'Mavi (Ctrl+Shift+B)' },
      { key: 'red', label: 'R', title: 'Kırmızı (Ctrl+Shift+R)' }
    ];
    
    const colorButtonsHTML = colorButtons.map(btn => 
      `<span class="ssh-color-btn" data-color="${btn.key}" style="background: ${this.customColors[btn.key]};" title="${btn.title}">${btn.label}</span>`
    ).join('');
    
    tooltip.innerHTML = `
      <div class="ssh-tooltip-colors">
        ${colorButtonsHTML}
        <span class="ssh-color-btn ssh-remove-btn" data-action="remove" title="Kaldır (Ctrl+Shift+X)">✕</span>
      </div>
    `;
    
    tooltip.style.position = 'fixed';
    tooltip.style.left = x + 'px';
    tooltip.style.top = (y - 50) + 'px';
    tooltip.style.zIndex = '999999';
    tooltip.style.pointerEvents = 'all';
    tooltip.style.userSelect = 'none';
    
    document.body.appendChild(tooltip);

    // Store the current selection for tooltip use
    const currentSelection = {
      text: selection.toString().replace(/\s+/g, ' ').trim(), // Normalize whitespace
      originalText: selection.toString(), // Keep original for debugging
      range: selection.getRangeAt(0).cloneRange(),
      xpath: this.getXPathForRange(selection.getRangeAt(0))
    };

    console.log('💡 Tooltip created with selection:', currentSelection.text);

    // Add individual click handlers to each button
    const tooltipButtons = tooltip.querySelectorAll('.ssh-color-btn');
    tooltipButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        console.log('🖱️ Tooltip button clicked:', button.dataset.color || button.dataset.action);
        console.log('🎯 Current selection for tooltip:', currentSelection.text);
        
        if (button.dataset.action === 'remove') {
          // Try to remove highlight from stored selection
          this.removeHighlightFromTooltip(currentSelection);
        } else if (button.dataset.color) {
          // Apply highlight with selected color
          this.highlightFromTooltip(currentSelection, button.dataset.color);
        }
        this.removeTooltip();
      });
    });

    // Also add mousedown handler to prevent selection loss
    tooltip.addEventListener('mousedown', (e) => {
      e.preventDefault(); // Prevent selection from being lost
    });

    // Remove tooltip when clicking elsewhere (but not immediately)
    setTimeout(() => {
      const handleClickOutside = (e) => {
        // Don't close if clicking on tooltip or its children
        if (!tooltip.contains(e.target) && !e.target.classList.contains('ssh-color-btn')) {
          this.removeTooltip();
          document.removeEventListener('click', handleClickOutside);
        }
      };
      document.addEventListener('click', handleClickOutside);
    }, 200);
  }

  removeTooltip() {
    const tooltip = document.querySelector('.ssh-tooltip');
    if (tooltip) {
      tooltip.remove();
    }
  }

  showTemporaryMessage(message) {
    // Remove any existing temporary message
    const existingMessage = document.querySelector('.ssh-temp-message');
    if (existingMessage) {
      existingMessage.remove();
    }

    const messageEl = document.createElement('div');
    messageEl.className = 'ssh-temp-message';
    messageEl.textContent = message;
    messageEl.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #333;
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      z-index: 10001;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: ssh-slideIn 0.3s ease-out;
    `;

    // Add CSS for animation
    if (!document.querySelector('#ssh-temp-styles')) {
      const styles = document.createElement('style');
      styles.id = 'ssh-temp-styles';
      styles.textContent = `
        @keyframes ssh-slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(styles);
    }

    document.body.appendChild(messageEl);

    // Remove after 3 seconds
    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.style.animation = 'ssh-slideIn 0.3s ease-out reverse';
        setTimeout(() => {
          if (messageEl.parentNode) {
            messageEl.remove();
          }
        }, 300);
      }
    }, 3000);
  }

  highlightSelection(color) {
    console.log('🖍️ Attempting to highlight with color:', color);
    
    const selection = window.getSelection();
    console.log('📊 Selection info:', {
      rangeCount: selection.rangeCount,
      selectedText: selection.toString(),
      textLength: selection.toString().length
    });
    
    if (selection.rangeCount === 0) {
      console.warn('⚠️ No selection range found');
      // Try to get selection from last mouse event
      const lastSelection = this.getLastSelection();
      if (lastSelection) {
        console.log('🔄 Using stored selection');
        this.highlightStoredSelection(lastSelection, color);
        return;
      }
      return;
    }
    
    const selectedText = selection.toString();
    if (selectedText.length === 0) {
      console.warn('⚠️ Selected text is empty');
      return;
    }

    // Normalize whitespace for consistent storage
    const normalizedText = selectedText.replace(/\s+/g, ' ').trim();
    const originalRange = selection.getRangeAt(0);
    
    // Store scroll position to prevent jumping during range operations
    const scrollX = window.pageXOffset;
    const scrollY = window.pageYOffset;
    
    // Create a working copy of the range
    let range = originalRange.cloneRange();
    
    // Validate range
    if (!range || !range.startContainer || !range.endContainer) {
      console.warn('⚠️ Invalid range detected');
      this.showTemporaryMessage('Geçersiz metin seçimi');
      return;
    }
    
    // Try to trim whitespace from selection boundaries to prevent layout issues
    try {
      // Check if we can safely trim the range
      if (range.startContainer.nodeType === Node.TEXT_NODE && 
          range.endContainer.nodeType === Node.TEXT_NODE) {
        
        // Trim leading whitespace
        const startText = range.startContainer.textContent;
        let newStartOffset = range.startOffset;
        while (newStartOffset < startText.length && /^\s/.test(startText.charAt(newStartOffset))) {
          newStartOffset++;
        }
        
        // Trim trailing whitespace
        const endText = range.endContainer.textContent;
        let newEndOffset = range.endOffset;
        while (newEndOffset > 0 && /\s$/.test(endText.charAt(newEndOffset - 1))) {
          newEndOffset--;
        }
        
        // Apply trimmed boundaries if valid
        if (newStartOffset <= newEndOffset) {
          range.setStart(range.startContainer, newStartOffset);
          range.setEnd(range.endContainer, newEndOffset);
        }
        
        // Final check after trimming
        if (range.collapsed) {
          console.warn('⚠️ Range became empty after trimming, using original');
          range = originalRange.cloneRange();
        }
      }
    } catch (trimError) {
      console.log('🔄 Range trimming failed, using original range:', trimError);
      range = originalRange.cloneRange();
    }
    
    // Restore scroll position if it changed during range manipulation
    if (window.pageXOffset !== scrollX || window.pageYOffset !== scrollY) {
      window.scrollTo(scrollX, scrollY);
    }
    
    console.log('📝 Selected text (normalized):', normalizedText);
    
    // Check for overlapping highlights and remove them BEFORE creating new one
    this.removeOverlappingHighlights(range);
    
    // Also check if this exact text is already highlighted and remove it
    this.removeExistingHighlightForText(normalizedText);

    // Create highlight data
    const highlightId = this.generateId();
    const highlightData = {
      id: highlightId,
      text: normalizedText,
      color: color,
      timestamp: Date.now(),
      xpath: this.getXPathForRange(range),
      offset: range.startOffset,
      length: normalizedText.length
    };

    console.log('💾 Creating highlight:', highlightData);

    // Apply highlight to DOM
    const success = this.applyHighlight(range, highlightData);
    
    if (success) {
      // Save to highlights array
      this.highlights.push(highlightData);
      this.saveHighlights();
      
      // Play sound effect if enabled
      this.playSound('highlight');
      
      // Clear cached selection since we just used it
      this.lastSelection = null;
      
      console.log('✅ Highlight created successfully');
    } else {
      console.error('❌ Failed to apply highlight');
    }
    
    // Clear selection after highlighting (but keep stored selection)
    setTimeout(() => {
      const currentSelection = window.getSelection();
      if (currentSelection.rangeCount > 0) {
        currentSelection.removeAllRanges();
      }
    }, 100);
  }

  applyHighlight(range, highlightData) {
    try {
      // Check if highlight already exists to prevent duplicates
      const existingElement = document.querySelector(`[data-highlight-id="${highlightData.id}"]`);
      if (existingElement) {
        console.log('⚠️ Highlight already exists, skipping:', highlightData.id);
        return true;
      }
      
      // Validate range first
      if (!range || !range.startContainer || !range.endContainer) {
        console.warn('⚠️ Invalid range provided');
        return false;
      }
      
      // Store the original scroll position to prevent jumping
      const scrollX = window.pageXOffset;
      const scrollY = window.pageYOffset;
      
      // Simple approach: try to wrap the range directly
      try {
        const span = document.createElement('span');
        span.className = `ssh-highlight ssh-${highlightData.color}`;
        span.dataset.highlightId = highlightData.id;
        span.title = `İşaretlendi: ${new Date(highlightData.timestamp).toLocaleString('tr-TR')}`;
        
        // Clone the range to avoid modifying the original
        const workingRange = range.cloneRange();
        
        // Get the text content before modifying
        const originalText = workingRange.toString();
        
        // Check if range is collapsed (empty selection)
        if (workingRange.collapsed) {
          console.warn('⚠️ Cannot highlight collapsed range');
          return false;
        }
        
        // Try extractContents first (most reliable)
        const contents = workingRange.extractContents();
        span.appendChild(contents);
        workingRange.insertNode(span);
        
        // Restore scroll position if it changed
        if (window.pageXOffset !== scrollX || window.pageYOffset !== scrollY) {
          window.scrollTo(scrollX, scrollY);
        }
        
        console.log('✅ Highlight applied successfully');
        return true;
        
      } catch (directError) {
        console.log('🔄 Direct method failed, trying surroundContents...');
        
        // Restore scroll position
        window.scrollTo(scrollX, scrollY);
        
        // Fallback: try surroundContents
        try {
          const span = document.createElement('span');
          span.className = `ssh-highlight ssh-${highlightData.color}`;
          span.dataset.highlightId = highlightData.id;
          span.title = `İşaretlendi: ${new Date(highlightData.timestamp).toLocaleString('tr-TR')}`;
          
          const workingRange = range.cloneRange();
          
          // Check if the range can be surrounded
          try {
            workingRange.surroundContents(span);
            console.log('✅ Highlight applied with surroundContents');
            return true;
          } catch (surroundError) {
            // If surroundContents fails, the range might cross element boundaries
            console.log('🔄 Range crosses boundaries, using manual method...');
            throw surroundError;
          }
          
        } catch (surroundError) {
          console.log('🔄 SurroundContents failed, trying manual insertion...');
          
          // Last resort: manual text replacement with layout preservation
          try {
            const span = document.createElement('span');
            span.className = `ssh-highlight ssh-${highlightData.color}`;
            span.dataset.highlightId = highlightData.id;
            span.title = `İşaretlendi: ${new Date(highlightData.timestamp).toLocaleString('tr-TR')}`;
            
            // Set the text content preserving whitespace
            span.textContent = highlightData.text;
            
            const workingRange = range.cloneRange();
            workingRange.deleteContents();
            workingRange.insertNode(span);
            
            // Restore scroll position
            window.scrollTo(scrollX, scrollY);
            
            console.log('✅ Highlight applied with manual method');
            return true;
            
          } catch (manualError) {
            console.warn('❌ All highlight methods failed:', manualError);
            
            // Restore scroll position
            window.scrollTo(scrollX, scrollY);
            
            // Final fallback: just save the data and show message
            this.showTemporaryMessage(`Highlight kaydedildi: "${highlightData.text.substring(0, 30)}..."`);
            return true; // Return true so it gets saved to storage
          }
        }
      }
      
    } catch (error) {
      console.error('❌ Critical error in applyHighlight:', error);
      return false;
    }
  }

  removeHighlightFromSelection() {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    
    // Find highlight element
    let highlightElement = null;
    if (container.nodeType === Node.TEXT_NODE) {
      highlightElement = container.parentElement;
    } else {
      highlightElement = container;
    }

    if (highlightElement && highlightElement.classList.contains('ssh-highlight')) {
      const highlightId = highlightElement.dataset.highlightId;
      this.removeHighlightById(highlightId);
    }
  }

  removeHighlightById(highlightId) {
    // Remove from DOM
    const element = document.querySelector(`[data-highlight-id="${highlightId}"]`);
    if (element) {
      const parent = element.parentNode;
      
      // Ensure parent exists and is not the document
      if (!parent || parent === document) {
        console.warn('⚠️ Invalid parent for highlight element');
        return;
      }
      
      try {
        // Safely unwrap the highlight element by moving all child nodes
        const fragment = document.createDocumentFragment();
        
        // Move all children to fragment
        while (element.firstChild) {
          fragment.appendChild(element.firstChild);
        }
        
        // If fragment has content, replace the element with it
        if (fragment.hasChildNodes()) {
          parent.replaceChild(fragment, element);
        } else {
          // If no content, just remove the element
          parent.removeChild(element);
        }
        
        // Normalize to merge adjacent text nodes and clean up
        parent.normalize();
        
        // Play sound effect if enabled
        this.playSound('remove');
        
        console.log('✅ Highlight element removed from DOM:', highlightId);
      } catch (error) {
        console.error('❌ Error removing highlight from DOM:', error);
        
        // Fallback: try simple removal
        try {
          parent.removeChild(element);
          parent.normalize();
        } catch (fallbackError) {
          console.error('❌ Fallback removal also failed:', fallbackError);
        }
      }
    } else {
      console.log('💡 Highlight element not found in DOM:', highlightId);
    }

    // Remove from highlights array
    const originalLength = this.highlights.length;
    this.highlights = this.highlights.filter(h => h.id !== highlightId);
    
    if (this.highlights.length < originalLength) {
      this.saveHighlights();
      console.log('✅ Highlight removed from data:', highlightId);
    } else {
      console.log('💡 Highlight not found in data:', highlightId);
    }
  }

  removeExistingHighlightForText(text) {
    console.log('🔍 Checking for existing highlights of text:', text.substring(0, 50) + '...');
    
    // Find highlights with the EXACT same text only (no partial matches for removal)
    const exactMatches = this.highlights.filter(h => h.text === text);
    
    if (exactMatches.length > 0) {
      console.log('🗑️ Removing existing highlights for text:', exactMatches.length);
      
      // Remove from DOM first
      exactMatches.forEach(highlight => {
        const element = document.querySelector(`[data-highlight-id="${highlight.id}"]`);
        if (element) {
          const parent = element.parentNode;
          
          // Ensure parent exists and is valid
          if (!parent || parent === document) {
            console.warn('⚠️ Invalid parent for highlight element:', highlight.id);
            return;
          }
          
          try {
            // Safely unwrap the highlight element
            const fragment = document.createDocumentFragment();
            
            // Move all children to fragment
            while (element.firstChild) {
              fragment.appendChild(element.firstChild);
            }
            
            // Replace the highlight element with its contents
            if (fragment.hasChildNodes()) {
              parent.replaceChild(fragment, element);
            } else {
              parent.removeChild(element);
            }
            
            // Normalize to merge adjacent text nodes
            parent.normalize();
          } catch (error) {
            console.error('❌ Error removing highlight element:', error);
            
            // Fallback removal
            try {
              parent.removeChild(element);
              parent.normalize();
            } catch (fallbackError) {
              console.error('❌ Fallback removal failed:', fallbackError);
            }
          }
        }
      });
      
      // Remove from highlights array in batch
      this.highlights = this.highlights.filter(h => 
        !exactMatches.some(existing => existing.id === h.id)
      );
      
      // Save only once after all removals
      this.saveHighlights();
      
      console.log('✅ Existing highlights removed');
    } else {
      console.log('💡 No existing highlights found for this text');
    }
  }

  removeOverlappingHighlights(range) {
    console.log('🔍 Checking for overlapping highlights in range...');
    
    // Get all nodes in the selection range
    const nodesInRange = [];
    const walker = document.createTreeWalker(
      range.commonAncestorContainer,
      NodeFilter.SHOW_ALL,
      {
        acceptNode: function(node) {
          // Check if node is within the range
          try {
            const nodeRange = document.createRange();
            if (node.nodeType === Node.TEXT_NODE) {
              nodeRange.selectNodeContents(node);
            } else {
              nodeRange.selectNode(node);
            }
            
            // Check if ranges intersect
            if (range.compareBoundaryPoints(Range.START_TO_END, nodeRange) >= 0 &&
                range.compareBoundaryPoints(Range.END_TO_START, nodeRange) <= 0) {
              return NodeFilter.FILTER_ACCEPT;
            }
          } catch (e) {
            // Ignore range comparison errors
          }
          return NodeFilter.FILTER_REJECT;
        }
      },
      false
    );
    
    let node;
    while (node = walker.nextNode()) {
      nodesInRange.push(node);
    }
    
    // Find highlight elements that overlap with our selection
    const overlappingHighlights = [];
    nodesInRange.forEach(node => {
      let element = node;
      
      // If it's a text node, check its parent
      if (node.nodeType === Node.TEXT_NODE) {
        element = node.parentElement;
      }
      
      // Check if this element or any of its parents is a highlight
      while (element && element !== document.body) {
        if (element.classList && element.classList.contains('ssh-highlight')) {
          const highlightId = element.dataset.highlightId;
          if (highlightId && !overlappingHighlights.includes(highlightId)) {
            overlappingHighlights.push(highlightId);
            console.log('🎯 Found overlapping highlight:', highlightId);
          }
          break;
        }
        element = element.parentElement;
      }
    });
    
    // Remove all overlapping highlights
    if (overlappingHighlights.length > 0) {
      console.log('🗑️ Removing', overlappingHighlights.length, 'overlapping highlights');
      overlappingHighlights.forEach(highlightId => {
        this.removeHighlightById(highlightId);
      });
    } else {
      console.log('💡 No overlapping highlights found');
    }
  }

  isSelectionHighlighted(range) {
    const container = range.commonAncestorContainer;
    let element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
    
    while (element && element !== document.body) {
      if (element.classList && element.classList.contains('ssh-highlight')) {
        return true;
      }
      element = element.parentElement;
    }
    return false;
  }

  navigateToHighlight(index) {
    const highlight = this.highlights[index];
    if (!highlight) return;

    const element = document.querySelector(`[data-highlight-id="${highlight.id}"]`);
    if (element) {
      element.scrollIntoView({behavior: 'smooth', block: 'center'});
      
      // Briefly flash the highlight
      element.style.outline = '3px solid #ff4444';
      setTimeout(() => {
        element.style.outline = '';
      }, 1000);
    }
  }

  loadHighlights() {
    // Prevent multiple loading attempts
    if (this.isLoading) {
      console.log('🔄 SSH: Already loading highlights, skipping...');
      return;
    }
    
    this.isLoading = true;
    console.log('📥 SSH: Loading highlights...');
    
    // Check browser API availability
    if (typeof browser === 'undefined') {
      console.error('❌ SSH: browser API not available');
      if (typeof chrome !== 'undefined') {
        console.log('🔄 SSH: Trying with chrome API...');
        window.browser = chrome; // Firefox sometimes needs this
      } else {
        console.error('❌ SSH: No browser APIs available');
        this.isLoading = false;
        return;
      }
    }
    
    if (!browser.runtime) {
      console.error('❌ SSH: browser.runtime not available');
      this.isLoading = false;
      return;
    }
    
    try {
      browser.runtime.sendMessage({action: 'load-highlights'})
        .then((response) => {
          console.log('📥 SSH: Highlights loaded:', response?.highlights?.length || 0, 'highlights');
          if (response && response.highlights) {
            this.highlights = response.highlights;
            this.restoreHighlights();
          }
          this.isLoading = false;
        })
        .catch((error) => {
          console.error('❌ SSH: Error loading highlights:', error);
          this.highlights = [];
          this.isLoading = false;
        });
    } catch (error) {
      console.error('❌ SSH: Exception in loadHighlights:', error);
      this.highlights = [];
      this.isLoading = false;
    }
  }

  saveHighlights() {
    // Debounce save operations to prevent excessive calls
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    // Use custom auto save interval or default to 3 seconds
    const saveDelay = (this.autoSaveInterval || 3000);
    
    this.saveTimeout = setTimeout(() => {
      console.log('💾 SSH: Saving highlights...', this.highlights.length);
      
      // Check browser API availability
      if (typeof browser === 'undefined') {
        if (typeof chrome !== 'undefined') {
          window.browser = chrome;
        } else {
          console.error('❌ SSH: No browser APIs available for saving');
          return;
        }
      }
      
      if (!browser.runtime) {
        console.error('❌ SSH: browser.runtime not available for saving');
        return;
      }
      
      try {
        browser.runtime.sendMessage({
          action: 'save-highlights',
          highlights: this.highlights
        }).then((response) => {
          console.log('💾 SSH: Highlights saved successfully');
        }).catch((error) => {
          console.error('❌ SSH: Error saving highlights:', error);
        });
      } catch (error) {
        console.error('❌ SSH: Exception in saveHighlights:', error);
      }
    }, this.autoSaveDelay); // Dynamic delay based on user setting
  }

  restoreHighlights() {
    // Prevent multiple restore attempts
    if (this.isRestoring) {
      console.log('🔄 SSH: Already restoring highlights, skipping...');
      return;
    }
    
    this.isRestoring = true;
    console.log('🔄 Restoring highlights from storage...', this.highlights.length);
    
    this.highlights.forEach((highlight, index) => {
      try {
        // Check if this highlight is already applied
        const existingElement = document.querySelector(`[data-highlight-id="${highlight.id}"]`);
        if (existingElement) {
          console.log('✅ Highlight already exists, skipping:', highlight.id);
          return;
        }
        
        const element = this.findElementByXPath(highlight.xpath);
        if (element && element.textContent) {
          const textContent = element.textContent;
          let startIndex = textContent.indexOf(highlight.text);
          
          // If exact match not found, try normalized search
          if (startIndex === -1) {
            const normalizedContent = textContent.replace(/\s+/g, ' ');
            const normalizedText = highlight.text.replace(/\s+/g, ' ');
            startIndex = normalizedContent.indexOf(normalizedText);
            
            if (startIndex !== -1) {
              // Convert normalized position back to original position
              let originalPos = 0;
              let normalizedPos = 0;
              while (normalizedPos < startIndex && originalPos < textContent.length) {
                if (/\s/.test(textContent[originalPos])) {
                  while (originalPos < textContent.length && /\s/.test(textContent[originalPos])) {
                    originalPos++;
                  }
                  normalizedPos++;
                } else {
                  originalPos++;
                  normalizedPos++;
                }
              }
              startIndex = originalPos;
            }
          }
          
          if (startIndex !== -1) {
            const textNode = this.getTextNode(element);
            
            if (textNode) {
              // Validate that the indices are within bounds
              const nodeTextLength = textNode.textContent.length;
              const endIndex = startIndex + highlight.text.length;
              
              if (startIndex >= 0 && endIndex <= nodeTextLength && startIndex < endIndex) {
                const range = document.createRange();
                range.setStart(textNode, startIndex);
                range.setEnd(textNode, endIndex);
                
                // Double-check the range text matches (allow for whitespace differences)
                const rangeText = range.toString();
                const normalizedRangeText = rangeText.replace(/\s+/g, ' ').trim();
                const normalizedHighlightText = highlight.text.replace(/\s+/g, ' ').trim();
                
                // Also try removing all whitespace for comparison
                const compactRangeText = rangeText.replace(/\s/g, '');
                const compactHighlightText = highlight.text.replace(/\s/g, '');
                
                if (rangeText === highlight.text || 
                    normalizedRangeText === normalizedHighlightText ||
                    compactRangeText === compactHighlightText) {
                  this.applyHighlight(range, highlight);
                  console.log('✅ Restored highlight:', highlight.text.substring(0, 30) + '...');
                } else {
                  // Try a more lenient match - check if the core content is the same
                  const coreRangeText = normalizedRangeText.replace(/[^\w]/g, '').toLowerCase();
                  const coreHighlightText = normalizedHighlightText.replace(/[^\w]/g, '').toLowerCase();
                  
                  if (coreRangeText === coreHighlightText && coreRangeText.length > 10) {
                    console.log('✅ Restored highlight with lenient matching:', highlight.text.substring(0, 30) + '...');
                    this.applyHighlight(range, highlight);
                  } else {
                    console.warn('❌ Could not match text for restore. Skipping highlight:', {
                      expected: highlight.text.substring(0, 50),
                      found: rangeText.substring(0, 50)
                    });
                  }
                }
              } else {
                console.warn('Invalid range indices during restore:', {startIndex, endIndex, nodeTextLength});
              }
            }
          } else {
            console.warn('Text not found for highlight:', highlight.text.substring(0, 50) + '...');
          }
        } else {
          console.warn('Element not found for xpath:', highlight.xpath);
        }
      } catch (e) {
        console.warn('Could not restore highlight:', highlight.text?.substring(0, 30), e);
      }
    });
    
    this.isRestoring = false;
    console.log('✅ SSH: Restore process completed');
  }

  getTextNode(element) {
    if (element.nodeType === Node.TEXT_NODE) {
      return element;
    }
    
    // Find the first text node that contains actual text
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          return node.textContent.trim().length > 0 ? 
            NodeFilter.FILTER_ACCEPT : 
            NodeFilter.FILTER_REJECT;
        }
      },
      false
    );
    
    return walker.nextNode();
  }

  getXPathForRange(range) {
    const element = range.startContainer.nodeType === Node.TEXT_NODE 
      ? range.startContainer.parentElement 
      : range.startContainer;
    return this.getXPathForElement(element);
  }

  getXPathForElement(element) {
    if (element.id) {
      return `//*[@id='${element.id}']`;
    }
    
    const path = [];
    while (element && element.nodeType === Node.ELEMENT_NODE) {
      let index = 0;
      let sibling = element.previousSibling;
      while (sibling) {
        if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === element.tagName) {
          index++;
        }
        sibling = sibling.previousSibling;
      }
      
      const tagName = element.tagName.toLowerCase();
      const pathIndex = index > 0 ? `[${index + 1}]` : '';
      path.unshift(`${tagName}${pathIndex}`);
      
      element = element.parentElement;
    }
    
    return '/' + path.join('/');
  }

  findElementByXPath(xpath) {
    try {
      const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      return result.singleNodeValue;
    } catch (e) {
      console.warn('XPath evaluation failed:', xpath, e);
      return null;
    }
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  restoreHighlightsIfNeeded() {
    // Prevent multiple restore attempts
    if (this.isRestoring || this.isLoading) {
      console.log('🔄 SSH: Already processing highlights, skipping check...');
      return;
    }
    
    // Check if we have highlights but none are visible on the page
    const visibleHighlights = document.querySelectorAll('.ssh-highlight').length;
    const storedHighlights = this.highlights.length;
    
    console.log('🔍 Checking highlights:', {stored: storedHighlights, visible: visibleHighlights});
    
    if (storedHighlights > 0 && visibleHighlights < storedHighlights) {
      console.log('🔄 Some highlights missing, restoring...');
      this.restoreHighlights();
    } else if (storedHighlights > 0 && visibleHighlights === 0) {
      console.log('🔄 No highlights visible, full restore...');
      this.restoreHighlights();
    } else {
      console.log('✅ All highlights are visible');
    }
  }

  createRangeForText(text, xpath) {
    try {
      console.log('🔍 Creating fresh range for text:', text.substring(0, 50) + '...');
      
      // Method 1: Try to find the element using xpath first
      const element = this.findElementByXPath(xpath);
      if (element) {
        const textContent = element.textContent;
        const startIndex = textContent.indexOf(text);
        
        if (startIndex !== -1) {
          // Get the text node
          const textNode = this.getTextNode(element);
          if (textNode && textNode.textContent.includes(text)) {
            const nodeStartIndex = textNode.textContent.indexOf(text);
            if (nodeStartIndex !== -1) {
              const range = document.createRange();
              range.setStart(textNode, nodeStartIndex);
              range.setEnd(textNode, nodeStartIndex + text.length);
              
              // Validate the range
              if (range.toString().trim() === text.trim()) {
                console.log('✅ Fresh range created successfully with xpath');
                return range;
              } else {
                console.warn('⚠️ Range text mismatch with xpath method');
              }
            }
          }
        }
      }
      
      // Method 2: Search in all text nodes for EXACT word matches
      console.log('🔄 Xpath method failed, searching for exact matches...');
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: function(node) {
            return node.textContent.trim().length > 0 ? 
              NodeFilter.FILTER_ACCEPT : 
              NodeFilter.FILTER_REJECT;
          }
        },
        false
      );
      
      let currentNode;
      while (currentNode = walker.nextNode()) {
        const nodeText = currentNode.textContent;
        const normalizedNodeText = nodeText.replace(/\s+/g, ' ');
        
        // Look for exact matches first (try both original and normalized)
        let exactIndex = normalizedNodeText.indexOf(text);
        if (exactIndex === -1) {
          exactIndex = nodeText.indexOf(text);
        }
        
        if (exactIndex !== -1) {
          // For normalized text search, we need to find the actual position in original text
          let actualStartIndex = exactIndex;
          if (normalizedNodeText.indexOf(text) !== -1 && normalizedNodeText !== nodeText) {
            // Convert normalized position back to original position
            let normalizedPos = 0;
            let originalPos = 0;
            while (normalizedPos < exactIndex && originalPos < nodeText.length) {
              if (/\s/.test(nodeText[originalPos])) {
                // Skip consecutive whitespace in normalization
                while (originalPos < nodeText.length && /\s/.test(nodeText[originalPos])) {
                  originalPos++;
                }
                normalizedPos++;
              } else {
                originalPos++;
                normalizedPos++;
              }
            }
            actualStartIndex = originalPos;
          }
          
          // Check if it's a reasonable word boundary
          const beforeChar = actualStartIndex > 0 ? nodeText[actualStartIndex - 1] : ' ';
          const afterChar = actualStartIndex + text.length < nodeText.length ? 
            nodeText[actualStartIndex + text.length] : ' ';
          
          // Allow match if surrounded by whitespace or punctuation
          const wordBoundaryPattern = /[\s\.,;:!?\-\(\)\[\]{}'"]/;
          const isWordBoundary = wordBoundaryPattern.test(beforeChar) && 
                                 wordBoundaryPattern.test(afterChar);
          
          if (isWordBoundary || actualStartIndex === 0 || actualStartIndex + text.length === nodeText.length) {
            const range = document.createRange();
            range.setStart(currentNode, actualStartIndex);
            range.setEnd(currentNode, actualStartIndex + text.length);
            
            // Validate the range
            const rangeText = range.toString().replace(/\s+/g, ' ').trim();
            if (rangeText === text || range.toString().trim() === text) {
              console.log('✅ Fresh range created successfully with exact match');
              return range;
            }
          }
        }
      }
      
      // Method 3: Try looser matching if exact didn't work
      console.log('🔄 Exact match failed, trying loose matching...');
      const walker2 = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      let node;
      while (node = walker2.nextNode()) {
        const nodeText = node.textContent;
        if (nodeText.includes(text)) {
          const startIndex = nodeText.indexOf(text);
          const range = document.createRange();
          range.setStart(node, startIndex);
          range.setEnd(node, startIndex + text.length);
          
          // Validate the range
          if (range.toString().trim() === text.trim()) {
            console.log('✅ Fresh range created successfully with loose matching');
            return range;
          }
        }
      }
      
      // Method 4: Use window.find() as last resort (but be careful with partial matches)
      console.log('🔄 Tree walker failed, trying window.find...');
      const selection = window.getSelection();
      const originalRanges = [];
      
      // Save current selection
      for (let i = 0; i < selection.rangeCount; i++) {
        originalRanges.push(selection.getRangeAt(i).cloneRange());
      }
      
      selection.removeAllRanges();
      
      if (window.find && window.find(text, false, false, false, false, true, false)) {
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0).cloneRange();
          
          // Validate the found range
          const rangeText = range.toString().replace(/\s+/g, ' ').trim();
          if (rangeText === text || range.toString().trim() === text) {
            // Restore original selection
            selection.removeAllRanges();
            originalRanges.forEach(r => selection.addRange(r));
            
            console.log('✅ Fresh range created successfully with window.find');
            return range;
          } else {
            console.warn('⚠️ window.find returned incorrect text:', range.toString());
          }
        }
      }
      
      // Restore original selection
      selection.removeAllRanges();
      originalRanges.forEach(r => selection.addRange(r));
      
      console.warn('⚠️ Could not find exact text with any method');
      return null;
      
    } catch (error) {
      console.error('❌ Error creating range for text:', error);
      return null;
    }
  }

  getLastSelection() {
    return this.lastSelection;
  }

  highlightStoredSelection(storedSelection, color) {
    if (!storedSelection || !storedSelection.text) {
      console.warn('⚠️ No stored selection available');
      return;
    }

    console.log('🔄 Highlighting stored selection:', storedSelection.text.substring(0, 50) + '...');
    
    // Try to create a fresh range by finding the text again
    let freshRange = this.createRangeForText(storedSelection.text, storedSelection.xpath);
    
    // If fresh range creation fails, try to use the original range if it's still valid
    if (!freshRange && storedSelection.range) {
      console.log('🔄 Fresh range creation failed, validating original range...');
      try {
        // Check if the original range is still valid and contains the expected text
        const originalText = storedSelection.range.toString().replace(/\s+/g, ' ').trim();
        if (originalText === storedSelection.text.trim()) {
          // Double-check that the range is still in the DOM
          if (storedSelection.range.startContainer && 
              storedSelection.range.startContainer.parentNode &&
              document.contains(storedSelection.range.startContainer)) {
            freshRange = storedSelection.range.cloneRange();
            console.log('✅ Using validated original stored range');
          } else {
            console.warn('⚠️ Original range container is no longer in DOM');
          }
        } else {
          console.warn('⚠️ Original range text mismatch:', originalText, 'vs', storedSelection.text);
        }
      } catch (e) {
        console.warn('⚠️ Original range validation failed:', e);
      }
    }
    
    if (!freshRange) {
      console.error('❌ Could not create any valid range for stored text');
      this.showTemporaryMessage(`"${storedSelection.text.substring(0, 30)}..." metni bulunamadı. Lütfen tekrar seçin.`);
      return;
    }
    
    // Check for overlapping highlights and remove them BEFORE creating new one
    this.removeOverlappingHighlights(freshRange);
    
    // Also check if this EXACT text is already highlighted and remove it
    this.removeExistingHighlightForText(storedSelection.text);
    
    const highlightId = this.generateId();
    const highlightData = {
      id: highlightId,
      text: storedSelection.text,
      color: color,
      timestamp: Date.now(),
      xpath: storedSelection.xpath,
      offset: freshRange.startOffset,
      length: storedSelection.text.length
    };

    const success = this.applyHighlight(freshRange, highlightData);
    
    if (success) {
      this.highlights.push(highlightData);
      this.saveHighlights();
      console.log('✅ Stored highlight created successfully');
      // Don't clear the selection - keep it for multiple highlights
    } else {
      console.error('❌ Failed to apply stored highlight');
      this.showTemporaryMessage('Highlight uygulanamadı. Lütfen tekrar seçin.');
    }
  }

  highlightFromTooltip(selection, color) {
    console.log('🖍️ Highlighting from tooltip with color:', color);
    
    if (!selection || !selection.text) {
      console.warn('⚠️ No selection available from tooltip');
      return;
    }

    // Try to create a fresh range by finding the text again
    const xpath = selection.xpath || this.getXPathForRange(selection.range);
    let freshRange = this.createRangeForText(selection.text, xpath);
    
    // If fresh range creation fails, try to use the original range
    if (!freshRange && selection.range) {
      console.log('🔄 Fresh range creation failed, validating original range...');
      try {
        const originalText = selection.range.toString().replace(/\s+/g, ' ').trim();
        if (originalText === selection.text.trim()) {
          // Double-check that the range is still in the DOM
          if (selection.range.startContainer && 
              selection.range.startContainer.parentNode &&
              document.contains(selection.range.startContainer)) {
            freshRange = selection.range.cloneRange();
            console.log('✅ Using validated original selection range');
          } else {
            console.warn('⚠️ Original selection range container is no longer in DOM');
          }
        } else {
          console.warn('⚠️ Original selection range text mismatch:', originalText, 'vs', selection.text);
        }
      } catch (e) {
        console.warn('⚠️ Original selection range validation failed:', e);
      }
    }
    
    if (!freshRange) {
      console.error('❌ Could not create any valid range for tooltip text');
      this.showTemporaryMessage(`"${selection.text.substring(0, 30)}..." metni bulunamadı. Lütfen tekrar seçin.`);
      return;
    }

    // Check for overlapping highlights and remove them BEFORE creating new one
    this.removeOverlappingHighlights(freshRange);
    
    // Also check if this EXACT text is already highlighted and remove it
    this.removeExistingHighlightForText(selection.text);

    const highlightId = this.generateId();
    const highlightData = {
      id: highlightId,
      text: selection.text,
      color: color,
      timestamp: Date.now(),
      xpath: xpath,
      offset: freshRange.startOffset,
      length: selection.text.length
    };

    const success = this.applyHighlight(freshRange, highlightData);
    
    if (success) {
      this.highlights.push(highlightData);
      this.saveHighlights();
      
      // Play sound effect if enabled
      this.playSound('highlight');
      
      // Clear cached selection since we just used it
      this.lastSelection = null;
      
      console.log('✅ Tooltip highlight created successfully');
    } else {
      console.error('❌ Failed to apply tooltip highlight');
      this.showTemporaryMessage('Highlight uygulanamadı. Lütfen tekrar seçin.');
    }
  }

  removeHighlightFromTooltip(selection) {
    console.log('🗑️ Removing highlight from tooltip');
    
    if (!selection || !selection.range) {
      console.warn('⚠️ No selection available for removal');
      return;
    }

    // Find if this selection overlaps with any existing highlight
    const container = selection.range.commonAncestorContainer;
    let element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
    
    while (element && element !== document.body) {
      if (element.classList && element.classList.contains('ssh-highlight')) {
        const highlightId = element.dataset.highlightId;
        this.removeHighlightById(highlightId);
        console.log('✅ Highlight removed from tooltip');
        return;
      }
      element = element.parentElement;
    }
    
    console.warn('⚠️ No highlight found to remove');
  }

  // Helper function to convert hex color to rgba
  hexToRgba(hex, alpha = 1) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return null;
    
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  updateCustomColorStyles() {
    console.log('🎨 Updating custom color styles');
    
    // Update CSS for custom colors
    let styleElement = document.getElementById('ssh-custom-colors-style');
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'ssh-custom-colors-style';
      document.head.appendChild(styleElement);
    }
    
    const opacity = 0.25; // Default opacity, can be overridden by opacity setting
    
    let cssRules = '';
    Object.entries(this.customColors).forEach(([colorName, colorValue]) => {
      const rgba = this.hexToRgba(colorValue, opacity);
      const rgbaLight = this.hexToRgba(colorValue, opacity * 0.6);
      
      if (rgba && rgbaLight) {
        cssRules += `
          .ssh-highlight.ssh-${colorName} {
            background: linear-gradient(135deg, ${rgba}, ${rgbaLight}) !important;
          }
        `;
      }
    });
    
    styleElement.textContent = cssRules;
    console.log('✅ Custom color styles updated');
  }

  updateHighlightOpacity(opacity) {
    console.log('🎨 Updating highlight opacity to:', opacity + '%');
    
    // Update CSS custom property or create new style
    let styleElement = document.getElementById('ssh-opacity-style');
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'ssh-opacity-style';
      document.head.appendChild(styleElement);
    }
    
    const opacityDecimal = opacity / 100;
    let cssRules = '';
    
    // Use custom colors instead of hardcoded ones
    Object.entries(this.customColors).forEach(([colorName, colorValue]) => {
      const rgba = this.hexToRgba(colorValue, opacityDecimal);
      const rgbaLight = this.hexToRgba(colorValue, opacityDecimal * 0.6);
      
      if (rgba && rgbaLight) {
        cssRules += `
          .ssh-highlight.ssh-${colorName} {
            background: linear-gradient(135deg, ${rgba}, ${rgbaLight}) !important;
          }
        `;
      }
    });
    
    styleElement.textContent = cssRules;
  }

  clearAllHighlights() {
    console.log('🗑️ Clearing all highlights...');
    
    // Remove from DOM
    document.querySelectorAll('.ssh-highlight').forEach(element => {
      const parent = element.parentNode;
      parent.replaceChild(element.firstChild, element);
      parent.normalize();
    });
    
    // Clear highlights array
    this.highlights = [];
    this.saveHighlights();
    
    console.log('✅ All highlights cleared');
  }

  importHighlights(newHighlights) {
    console.log('📥 Importing highlights:', newHighlights.length);
    
    // Add to existing highlights (avoid duplicates)
    newHighlights.forEach(highlight => {
      // Check if highlight with same text already exists
      const existingHighlight = this.highlights.find(h => 
        h.text === highlight.text && h.xpath === highlight.xpath
      );
      
      if (!existingHighlight) {
        // Generate new ID for imported highlight
        highlight.id = this.generateId();
        highlight.timestamp = Date.now();
        this.highlights.push(highlight);
      }
    });
    
    // Save and restore
    this.saveHighlights();
    setTimeout(() => {
      this.restoreHighlights();
    }, 100);
    
    console.log('✅ Highlights imported, total count:', this.highlights.length);
  }

  updateShortcuts(shortcuts) {
    console.log('⌨️ Updating keyboard shortcuts:', shortcuts);
    this.customShortcuts = shortcuts;
    
    // Update keyboard event listener (remove old, add new)
    // This would require re-initializing the keyboard listener
    // For now, just store the shortcuts
  }

  updateBorderRadius(borderRadius) {
    console.log(`🔲 Updating border radius: ${borderRadius}px`);
    
    let styleElement = document.getElementById('ssh-border-radius-style');
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'ssh-border-radius-style';
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = `
      .ssh-highlight {
        border-radius: ${borderRadius}px !important;
      }
    `;
  }

  updateHighlightStyle(style) {
    console.log(`🎨 Updating highlight style: ${style}`);
    
    let styleElement = document.getElementById('ssh-highlight-style');
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'ssh-highlight-style';
      document.head.appendChild(styleElement);
    }
    
    let additionalStyles = '';
    
    switch (style) {
      case 'bold':
        additionalStyles = `
          .ssh-highlight {
            font-weight: bold !important;
            background-size: 100% 4px !important;
          }
        `;
        break;
      case 'underline':
        additionalStyles = `
          .ssh-highlight {
            text-decoration: underline !important;
            text-decoration-thickness: 3px !important;
            background: transparent !important;
          }
        `;
        break;
      case 'box':
        additionalStyles = `
          .ssh-highlight {
            border: 2px solid currentColor !important;
            background: transparent !important;
            padding: 2px 4px !important;
          }
        `;
        break;
      case 'marker':
        additionalStyles = `
          .ssh-highlight {
            background-image: linear-gradient(transparent 40%, currentColor 40%, currentColor 80%, transparent 80%) !important;
            background-size: 100% 1.2em !important;
            background-repeat: no-repeat !important;
            background-position: 0 0 !important;
          }
        `;
        break;
      default: // smooth
        additionalStyles = `
          .ssh-highlight {
            /* Default smooth style - already applied */
          }
        `;
    }
    
    styleElement.textContent = additionalStyles;
  }

  updateGeneralSetting(key, value) {
    console.log(`⚙️ Updating setting: ${key} = ${value}`);
    
    // Store settings locally
    if (!this.userSettings) {
      this.userSettings = {};
    }
    this.userSettings[key] = value;
    
    // Apply specific settings
    switch(key) {
      case 'showTooltip':
        this.showTooltipEnabled = value;
        if (!value) {
          this.removeTooltip();
        }
        break;
      case 'soundEffects':
        this.soundEffectsEnabled = value;
        break;
      case 'animationEffects':
        this.animationEffectsEnabled = value;
        this.updateAnimationStyles(value);
        break;
      case 'maxHighlights':
        this.maxHighlights = value;
        break;
      case 'autoSaveInterval':
        this.updateAutoSaveInterval(value);
        break;
      default:
        console.log(`Setting ${key} stored but no immediate action needed`);
    }
  }

  updateAnimationStyles(enabled) {
    let styleElement = document.getElementById('ssh-animation-style');
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'ssh-animation-style';
      document.head.appendChild(styleElement);
    }
    
    if (enabled) {
      styleElement.textContent = `
        .ssh-highlight {
          transition: all 0.3s ease !important;
        }
        .ssh-tooltip {
          animation: ssh-tooltip-fadeIn 0.2s ease-out !important;
        }
        @keyframes ssh-tooltip-fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      `;
    } else {
      styleElement.textContent = `
        .ssh-highlight {
          transition: none !important;
        }
        .ssh-tooltip {
          animation: none !important;
        }
      `;
    }
  }

  updateAutoSaveInterval(interval) {
    // Update debounce timeout for saving
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.autoSaveInterval = interval * 1000; // Convert to milliseconds
  }

  playSound(type) {
    if (!this.soundEffectsEnabled) return;
    
    // Create audio context for sound effects
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Different sounds for different actions
      switch(type) {
        case 'highlight':
          this.playHighlightSound(audioContext);
          break;
        case 'remove':
          this.playRemoveSound(audioContext);
          break;
        default:
          this.playDefaultSound(audioContext);
      }
    } catch (error) {
      console.warn('Could not play sound effect:', error);
    }
  }

  playHighlightSound(audioContext) {
    // Create a pleasant "ding" sound for highlighting
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    
    // Connect the audio nodes
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Configure the filter for a warmer sound
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, audioContext.currentTime);
    filter.Q.setValueAtTime(1, audioContext.currentTime);
    
    // Create a rising tone sequence (C-E-G major chord arpeggio)
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
    oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.05); // E5
    oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.1); // G5
    
    // Smooth envelope
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.25);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.25);
  }

  playRemoveSound(audioContext) {
    // Create a subtle "pop" sound for removing highlights
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    
    // Connect the audio nodes
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Configure for a softer, descending sound
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1500, audioContext.currentTime);
    filter.Q.setValueAtTime(1.5, audioContext.currentTime);
    
    // Descending tone (G-E-C)
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime); // G5
    oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.04); // E5
    oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime + 0.08); // C5
    
    // Quick fade envelope
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.12, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  }

  playDefaultSound(audioContext) {
    // Neutral notification sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  }
}

// Initialize the highlight manager
console.log('🚀 SSH: Content script loading...');

// Global variable to make it accessible
let highlightManager = null;

// Check if already initialized to prevent duplicate loading
if (window.sshInitialized) {
  console.log('⚠️ SSH: Already initialized, skipping duplicate load...');
} else {
  // Mark as initialized immediately to prevent race conditions
  window.sshInitialized = true;
  
  // Initialize immediately
  try {
    highlightManager = new HighlightManager();
    window.highlightManager = highlightManager; // Make globally accessible for debugging
    console.log('✅ SSH: Highlight manager created successfully');
  } catch (error) {
    console.error('❌ SSH: Error creating highlight manager:', error);
    // Reset flag if initialization failed
    window.sshInitialized = false;
  }
}
