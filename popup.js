// TabLocker popup script
// Handles the UI and interaction with the background script

document.addEventListener('DOMContentLoaded', () => {
  // Initialize the Preact app
  renderApp();
});

// Main app component rendering function
function renderApp() {
  const appContainer = document.getElementById('app');
  
  // For now, we'll use plain JavaScript to create the UI
  // In a future step, we'll replace this with Preact components
  
  const container = document.createElement('div');
  container.className = 'container';
  
  // Header
  const header = document.createElement('div');
  header.className = 'header';
  
  const title = document.createElement('h1');
  title.textContent = 'TabLocker';
  title.style.margin = '0';
  
  header.appendChild(title);
  container.appendChild(header);
  
  // Action buttons
  const actionButtons = document.createElement('div');
  actionButtons.className = 'action-buttons';
  
  const saveButton = document.createElement('button');
  saveButton.textContent = 'Save All Tabs';
  saveButton.addEventListener('click', saveAllTabs);
  
  const restoreButton = document.createElement('button');
  restoreButton.textContent = 'Restore Tabs';
  restoreButton.addEventListener('click', showSavedSessions);
  
  actionButtons.appendChild(saveButton);
  actionButtons.appendChild(restoreButton);
  container.appendChild(actionButtons);
  
  // Status area
  const statusArea = document.createElement('div');
  statusArea.id = 'status';
  statusArea.style.margin = '10px 0';
  container.appendChild(statusArea);
  
  // Content area for displaying saved sessions or tabs
  const contentArea = document.createElement('div');
  contentArea.id = 'content';
  container.appendChild(contentArea);
  
  appContainer.appendChild(container);
}

// Save all currently open tabs
async function saveAllTabs() {
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    
    // Simplify the tab objects to only include necessary data
    const simplifiedTabs = tabs.map(tab => ({
      id: tab.id,
      url: tab.url,
      title: tab.title,
      favIconUrl: tab.favIconUrl
    }));
    
    // Send the tabs to the background script for saving
    const response = await chrome.runtime.sendMessage({
      action: 'saveTabs',
      tabs: simplifiedTabs
    });
    
    if (response.success) {
      showStatus(`Saved ${response.result.tabCount} tabs successfully!`, 'success');
    } else {
      showStatus(`Error: ${response.error}`, 'error');
    }
  } catch (error) {
    showStatus(`Error: ${error.message}`, 'error');
  }
}

// Show all saved sessions
async function showSavedSessions() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'getTabs'
    });
    
    if (!response.success) {
      showStatus(`Error: ${response.error}`, 'error');
      return;
    }
    
    const sessions = response.tabs;
    const contentArea = document.getElementById('content');
    contentArea.innerHTML = '';
    
    if (sessions.length === 0) {
      contentArea.textContent = 'No saved sessions found.';
      return;
    }
    
    // Create a list of sessions
    const sessionList = document.createElement('div');
    sessionList.className = 'session-list';
    
    sessions.forEach(session => {
      const sessionItem = document.createElement('div');
      sessionItem.className = 'session-item';
      
      const sessionHeader = document.createElement('div');
      sessionHeader.className = 'session-header';
      
      const sessionDate = new Date(session.date);
      const dateString = sessionDate.toLocaleString();
      
      sessionHeader.innerHTML = `
        <strong>${dateString}</strong> - ${session.tabs.length} tabs
        <button class="restore-session-btn" data-session-id="${session.id}">Restore</button>
      `;
      
      sessionItem.appendChild(sessionHeader);
      
      // Add a preview of the tabs
      const tabPreview = document.createElement('div');
      tabPreview.className = 'tab-preview';
      
      // Show up to 5 tabs as preview
      const previewTabs = session.tabs.slice(0, 5);
      previewTabs.forEach(tab => {
        const tabItem = document.createElement('div');
        tabItem.className = 'tab-item';
        
        const favicon = document.createElement('img');
        favicon.className = 'favicon';
        favicon.src = tab.favIconUrl || 'icons/default-favicon.png';
        favicon.onerror = () => { favicon.src = 'icons/default-favicon.png'; };
        
        const tabTitle = document.createElement('div');
        tabTitle.className = 'tab-title';
        tabTitle.textContent = tab.title;
        
        tabItem.appendChild(favicon);
        tabItem.appendChild(tabTitle);
        tabPreview.appendChild(tabItem);
      });
      
      if (session.tabs.length > 5) {
        const moreIndicator = document.createElement('div');
        moreIndicator.className = 'more-indicator';
        moreIndicator.textContent = `... and ${session.tabs.length - 5} more`;
        tabPreview.appendChild(moreIndicator);
      }
      
      sessionItem.appendChild(tabPreview);
      sessionList.appendChild(sessionItem);
    });
    
    contentArea.appendChild(sessionList);
    
    // Add event listeners to restore buttons
    document.querySelectorAll('.restore-session-btn').forEach(button => {
      button.addEventListener('click', () => {
        const sessionId = button.getAttribute('data-session-id');
        restoreSession(sessionId, sessions);
      });
    });
  } catch (error) {
    showStatus(`Error: ${error.message}`, 'error');
  }
}

// Restore a specific session
function restoreSession(sessionId, sessions) {
  const session = sessions.find(s => s.id === sessionId);
  if (!session) {
    showStatus('Session not found', 'error');
    return;
  }
  
  // Open each tab in the session
  session.tabs.forEach(tab => {
    chrome.tabs.create({ url: tab.url });
  });
  
  showStatus(`Restored ${session.tabs.length} tabs`, 'success');
}

// Display a status message
function showStatus(message, type = 'info') {
  const statusArea = document.getElementById('status');
  statusArea.textContent = message;
  statusArea.className = `status ${type}`;
  
  // Clear the status after 3 seconds
  setTimeout(() => {
    statusArea.textContent = '';
    statusArea.className = 'status';
  }, 3000);
}
