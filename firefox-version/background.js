/* Background script for Super Simple Highlighter */

// Heartbeat system to keep service worker alive
let heartbeatInterval;

function startHeartbeat() {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  
  heartbeatInterval = setInterval(() => {
    try {
      // Simple heartbeat to keep background script active
      browser.storage.local.get('heartbeat').then(() => {
        // Heartbeat successful
      }).catch(() => {
        // Ignore heartbeat errors
      });
    } catch (e) {
      // Ignore heartbeat errors
    }
  }, 25000); // Every 25 seconds
}

// Start heartbeat on startup
startHeartbeat();

// Listen for command shortcuts
browser.commands.onCommand.addListener((command) => {
  try {
    browser.tabs.query({active: true, currentWindow: true}).then((tabs) => {
      const tab = tabs[0];
      if (!tab) return;
      
      // Send message to content script based on command
      switch(command) {
        case 'highlight-yellow':
          browser.tabs.sendMessage(tab.id, {action: 'highlight', color: 'yellow'})
            .catch(err => console.log('Command message failed:', err));
          break;
        case 'highlight-green':
          browser.tabs.sendMessage(tab.id, {action: 'highlight', color: 'green'})
            .catch(err => console.log('Command message failed:', err));
          break;
        case 'highlight-blue':
          browser.tabs.sendMessage(tab.id, {action: 'highlight', color: 'blue'})
            .catch(err => console.log('Command message failed:', err));
          break;
        case 'highlight-red':
          browser.tabs.sendMessage(tab.id, {action: 'highlight', color: 'red'})
            .catch(err => console.log('Command message failed:', err));
          break;
        case 'remove-highlight':
          browser.tabs.sendMessage(tab.id, {action: 'remove-highlight'})
            .catch(err => console.log('Command message failed:', err));
          break;
      }
    });
  } catch (e) {
    console.error('Command handler error:', e);
  }
});

// Handle messages from content script
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message.action === 'save-highlights') {
      // Save highlights for this URL
      const url = sender.tab.url;
      const urlKey = getUrlKey(url);
      
      browser.storage.local.set({
        [urlKey]: message.highlights
    }).then(() => {
      console.log('🟢 Background: Highlights saved successfully');
      sendResponse({success: true});
    }).catch((error) => {
      console.error('🔴 Background: Save error:', error);
      sendResponse({success: false, error: error.message});
    });
    
    return true; // Will respond asynchronously
  }
  
  if (message.action === 'load-highlights') {
    const url = sender.tab.url;
    const urlKey = getUrlKey(url);
    
    browser.storage.local.get(urlKey).then((result) => {
      const highlights = result[urlKey] || [];
      console.log('🟢 Background: Highlights loaded:', highlights.length);
      sendResponse({highlights: highlights});
    }).catch((error) => {
      console.error('🔴 Background: Load error:', error);
      sendResponse({highlights: []});
    });
    
    return true; // Will respond asynchronously
  }
  } catch (e) {
    console.error('🔴 Background: Message handler error:', e);
    sendResponse({success: false, error: e.message});
  }
  
  return false;
});

// Generate a consistent key for URL storage
function getUrlKey(url) {
  try {
    const urlObj = new URL(url);
    // Use hostname + pathname to ignore search params and fragments
    return 'highlights_' + btoa(urlObj.hostname + urlObj.pathname).replace(/[^a-zA-Z0-9]/g, '');
  } catch (e) {
    // Fallback for invalid URLs
    return 'highlights_' + btoa(url).replace(/[^a-zA-Z0-9]/g, '');
  }
}
