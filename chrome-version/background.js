/* Background script for Super Highlighter - Chrome Version */

console.log('🔧 Background service worker started at:', new Date().toISOString());

// Add a heartbeat to keep service worker alive
let heartbeatInterval;

// Start heartbeat when service worker starts
function startHeartbeat() {
  // Clear any existing interval first
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }
  
  heartbeatInterval = setInterval(() => {
    try {
      console.log('💓 Service worker heartbeat:', new Date().toISOString());
    } catch (error) {
      console.error('❌ Heartbeat error:', error);
    }
  }, 30000); // Every 30 seconds
}

// Clean up on shutdown
self.addEventListener('beforeunload', () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }
});

startHeartbeat();

// Listen for command shortcuts
chrome.commands.onCommand.addListener((command) => {
  console.log('⌨️ Command received:', command);
  
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    const tab = tabs[0];
    
    // Send message to content script based on command
    switch(command) {
      case 'highlight-yellow':
        chrome.tabs.sendMessage(tab.id, {action: 'highlight', color: 'yellow'})
          .catch(err => console.error('❌ Error sending yellow highlight command:', err));
        break;
      case 'highlight-green':
        chrome.tabs.sendMessage(tab.id, {action: 'highlight', color: 'green'})
          .catch(err => console.error('❌ Error sending green highlight command:', err));
        break;
      case 'highlight-blue':
        chrome.tabs.sendMessage(tab.id, {action: 'highlight', color: 'blue'})
          .catch(err => console.error('❌ Error sending blue highlight command:', err));
        break;
      case 'remove-highlight':
        chrome.tabs.sendMessage(tab.id, {action: 'remove-highlight'})
          .catch(err => console.error('❌ Error sending remove highlight command:', err));
        break;
    }
  });
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    console.log('📨 Background received message:', message.action, 'from tab:', sender.tab?.id);
    
    if (message.action === 'save-highlights') {
      // Save highlights for this URL
      const url = sender.tab.url;
      const urlKey = getUrlKey(url);
      
      console.log('💾 Saving highlights for:', url, 'Key:', urlKey, 'Count:', message.highlights.length);
      
      chrome.storage.local.set({
        [urlKey]: message.highlights
      }).then(() => {
        console.log('✅ Highlights saved successfully');
        sendResponse({success: true});
      }).catch((error) => {
        console.error('❌ Error saving highlights:', error);
        sendResponse({success: false, error: error.message});
      });
      
      return true; // Will respond asynchronously
    }
    
    if (message.action === 'load-highlights') {
      const url = sender.tab.url;
      const urlKey = getUrlKey(url);
      
      console.log('📥 Loading highlights for:', url, 'Key:', urlKey);
      
      chrome.storage.local.get(urlKey).then((result) => {
        const highlights = result[urlKey] || [];
        console.log('📥 Loaded highlights count:', highlights.length);
        sendResponse({highlights: highlights});
      }).catch((error) => {
        console.error('❌ Error loading highlights:', error);
        sendResponse({highlights: []});
      });
      
      return true; // Will respond asynchronously
    }
    
  } catch (error) {
    console.error('❌ Error in background message handler:', error);
    sendResponse({error: error.message});
    return false;
  }
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
