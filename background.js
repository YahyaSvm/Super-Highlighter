/* Background script for Super Simple Highlighter */



// Listen for command shortcuts
browser.commands.onCommand.addListener((command) => {
  
  
  browser.tabs.query({active: true, currentWindow: true}, (tabs) => {
    const tab = tabs[0];
    
    // Send message to content script based on command
    switch(command) {
      case 'highlight-yellow':
        browser.tabs.sendMessage(tab.id, {action: 'highlight', color: 'yellow'})
          .catch(err => );
        break;
      case 'highlight-green':
        browser.tabs.sendMessage(tab.id, {action: 'highlight', color: 'green'})
          .catch(err => );
        break;
      case 'highlight-blue':
        browser.tabs.sendMessage(tab.id, {action: 'highlight', color: 'blue'})
          .catch(err => );
        break;
      case 'highlight-red':
        browser.tabs.sendMessage(tab.id, {action: 'highlight', color: 'red'})
          .catch(err => );
        break;
      case 'remove-highlight':
        browser.tabs.sendMessage(tab.id, {action: 'remove-highlight'})
          .catch(err => );
        break;
    }
  });
});

// Handle messages from content script
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  
  
  if (message.action === 'save-highlights') {
    // Save highlights for this URL
    const url = sender.tab.url;
    const urlKey = getUrlKey(url);
    
    
    
    browser.storage.local.set({
      [urlKey]: message.highlights
    }).then(() => {
      
      sendResponse({success: true});
    }).catch((error) => {
      
      sendResponse({success: false, error: error.message});
    });
    
    return true; // Will respond asynchronously
  }
  
  if (message.action === 'load-highlights') {
    const url = sender.tab.url;
    const urlKey = getUrlKey(url);
    
    
    
    browser.storage.local.get(urlKey).then((result) => {
      const highlights = result[urlKey] || [];
      
      sendResponse({highlights: highlights});
    }).catch((error) => {
      
      sendResponse({highlights: []});
    });
    
    return true; // Will respond asynchronously
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
