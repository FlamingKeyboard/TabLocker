import { h, render, Component } from 'preact';
import { initDragAndDrop, reorderTabs } from './dragdrop';
import { decryptData, encryptData } from './crypto';

// Main function to initialize the dashboard page
export function init() {
  console.log('Initializing TabLocker Dashboard');
  
  // Get the dashboard content container
  const dashboardContent = document.getElementById('dashboardContent');
  
  // Set up event listeners for the action buttons
  document.getElementById('saveCurrentTabs').addEventListener('click', saveCurrentTabs);
  document.getElementById('createNewSession').addEventListener('click', createNewSession);
  
  // Load and display sessions
  loadSessions();
  
  // Function to load sessions from storage
  async function loadSessions() {
    try {
      // Get sessions from storage
      const storage = await chrome.storage.local.get(['sessions', 'encryptionKeyExists']);
      
      // Check if encryption key exists
      if (!storage.encryptionKeyExists) {
        showError('Encryption key not found. Please open the popup first to initialize encryption.');
        return;
      }
      
      // Get sessions
      let sessions = storage.sessions || [];
      
      // Decrypt sessions if they exist
      if (sessions.length > 0) {
        sessions = await decryptData(sessions);
      }
      
      // Display sessions
      displaySessions(sessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
      showError('Failed to load sessions. See console for details.');
    }
  }
  
  // Function to display sessions
  function displaySessions(sessions) {
    // Clear the dashboard content
    dashboardContent.innerHTML = '';
    
    // If no sessions, show empty state
    if (!sessions || sessions.length === 0) {
      dashboardContent.innerHTML = `
        <div class="dashboard-empty-state">
          <div class="dashboard-empty-state-icon">📋</div>
          <div class="dashboard-empty-state-text">
            You don't have any saved sessions yet.
            <br><br>
            Click "Save Current Tabs" to create your first session.
          </div>
        </div>
      `;
      return;
    }
    
    // Create a card for each session
    sessions.forEach(session => {
      const sessionCard = document.createElement('div');
      sessionCard.className = 'dashboard-card session-item';
      sessionCard.setAttribute('data-session-id', session.id);
      
      // Create the card header
      const cardHeader = document.createElement('div');
      cardHeader.className = 'dashboard-card-header';
      
      // Create the card title
      const cardTitle = document.createElement('h3');
      cardTitle.className = 'dashboard-card-title';
      cardTitle.textContent = session.name;
      
      // Create the card actions
      const cardActions = document.createElement('div');
      cardActions.className = 'dashboard-card-actions';
      
      // Create the restore button
      const restoreButton = document.createElement('button');
      restoreButton.className = 'dashboard-button';
      restoreButton.textContent = 'Restore';
      restoreButton.addEventListener('click', () => restoreSession(session.id));
      
      // Create the rename button
      const renameButton = document.createElement('button');
      renameButton.className = 'dashboard-button secondary';
      renameButton.textContent = 'Rename';
      renameButton.addEventListener('click', () => renameSession(session.id));
      
      // Create the delete button
      const deleteButton = document.createElement('button');
      deleteButton.className = 'dashboard-button danger';
      deleteButton.textContent = 'Delete';
      deleteButton.addEventListener('click', () => deleteSession(session.id));
      
      // Add the buttons to the card actions
      cardActions.appendChild(restoreButton);
      cardActions.appendChild(renameButton);
      cardActions.appendChild(deleteButton);
      
      // Add the title and actions to the card header
      cardHeader.appendChild(cardTitle);
      cardHeader.appendChild(cardActions);
      
      // Create the tab list
      const tabList = document.createElement('div');
      tabList.className = 'dashboard-tabs tab-list';
      
      // Add tabs to the list
      session.tabs.forEach((tab, index) => {
        const tabItem = document.createElement('div');
        tabItem.className = 'dashboard-tab tab-item';
        tabItem.setAttribute('data-index', index);
        
        // Create favicon
        const favicon = document.createElement('img');
        favicon.className = 'dashboard-tab-favicon';
        favicon.src = tab.favIconUrl || 'icons/icon16.svg';
        favicon.alt = '';
        
        // Create tab title
        const tabTitle = document.createElement('div');
        tabTitle.className = 'dashboard-tab-title';
        tabTitle.textContent = tab.title || tab.url;
        
        // Add favicon and title to the tab item
        tabItem.appendChild(favicon);
        tabItem.appendChild(tabTitle);
        
        // Add the tab item to the list
        tabList.appendChild(tabItem);
      });
      
      // Add the header and tab list to the card
      sessionCard.appendChild(cardHeader);
      sessionCard.appendChild(tabList);
      
      // Add the card to the dashboard
      dashboardContent.appendChild(sessionCard);
    });
    
    // Initialize drag and drop
    const dragDropManager = initDragAndDrop(dashboardContent, handleTabReorder);
    
    // Function to handle tab reordering
    async function handleTabReorder(reorderInfo) {
      try {
        // Get sessions from storage
        const storage = await chrome.storage.local.get(['sessions']);
        let sessions = storage.sessions || [];
        
        // Decrypt sessions
        sessions = await decryptData(sessions);
        
        // Reorder tabs
        const updatedSessions = reorderTabs(sessions, reorderInfo);
        
        // Encrypt sessions
        const encryptedSessions = await encryptData(updatedSessions);
        
        // Save to storage
        await chrome.storage.local.set({ sessions: encryptedSessions });
        
        // Reload sessions
        loadSessions();
      } catch (error) {
        console.error('Error reordering tabs:', error);
        showError('Failed to reorder tabs. See console for details.');
      }
    }
  }
  
  // Function to save current tabs
  async function saveCurrentTabs() {
    try {
      // Get current window tabs
      const tabs = await chrome.tabs.query({ currentWindow: true });
      
      // Format tabs
      const formattedTabs = tabs.map(tab => ({
        url: tab.url,
        title: tab.title,
        favIconUrl: tab.favIconUrl
      }));
      
      // Create session name with date and time
      const now = new Date();
      const sessionName = `Session ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
      
      // Create session object
      const newSession = {
        id: Date.now().toString(),
        name: sessionName,
        tabs: formattedTabs,
        createdAt: now.toISOString()
      };
      
      // Get existing sessions
      const storage = await chrome.storage.local.get(['sessions']);
      let sessions = storage.sessions || [];
      
      // Decrypt sessions if they exist
      if (sessions.length > 0) {
        sessions = await decryptData(sessions);
      }
      
      // Add new session
      sessions.push(newSession);
      
      // Encrypt sessions
      const encryptedSessions = await encryptData(sessions);
      
      // Save to storage
      await chrome.storage.local.set({ sessions: encryptedSessions });
      
      // Show success message
      showMessage('Current tabs saved successfully!');
      
      // Reload sessions
      loadSessions();
    } catch (error) {
      console.error('Error saving current tabs:', error);
      showError('Failed to save current tabs. See console for details.');
    }
  }
  
  // Function to create a new empty session
  async function createNewSession() {
    try {
      // Prompt for session name
      const sessionName = prompt('Enter a name for the new session:', `New Session ${new Date().toLocaleDateString()}`);
      
      // If canceled, return
      if (!sessionName) return;
      
      // Create session object
      const newSession = {
        id: Date.now().toString(),
        name: sessionName,
        tabs: [],
        createdAt: new Date().toISOString()
      };
      
      // Get existing sessions
      const storage = await chrome.storage.local.get(['sessions']);
      let sessions = storage.sessions || [];
      
      // Decrypt sessions if they exist
      if (sessions.length > 0) {
        sessions = await decryptData(sessions);
      }
      
      // Add new session
      sessions.push(newSession);
      
      // Encrypt sessions
      const encryptedSessions = await encryptData(sessions);
      
      // Save to storage
      await chrome.storage.local.set({ sessions: encryptedSessions });
      
      // Show success message
      showMessage('New session created successfully!');
      
      // Reload sessions
      loadSessions();
    } catch (error) {
      console.error('Error creating new session:', error);
      showError('Failed to create new session. See console for details.');
    }
  }
  
  // Function to restore a session
  async function restoreSession(sessionId) {
    try {
      // Get sessions from storage
      const storage = await chrome.storage.local.get(['sessions']);
      let sessions = storage.sessions || [];
      
      // Decrypt sessions
      sessions = await decryptData(sessions);
      
      // Find the session
      const session = sessions.find(s => s.id === sessionId);
      
      // If session not found, show error
      if (!session) {
        showError('Session not found.');
        return;
      }
      
      // If no tabs, show message
      if (session.tabs.length === 0) {
        showMessage('This session has no tabs to restore.');
        return;
      }
      
      // Confirm restore
      const confirmRestore = confirm(`Restore ${session.tabs.length} tabs from "${session.name}"?`);
      
      // If not confirmed, return
      if (!confirmRestore) return;
      
      // Create new window with the tabs
      await chrome.windows.create({
        url: session.tabs.map(tab => tab.url),
        focused: true
      });
      
      // Show success message
      showMessage('Session restored successfully!');
    } catch (error) {
      console.error('Error restoring session:', error);
      showError('Failed to restore session. See console for details.');
    }
  }
  
  // Function to rename a session
  async function renameSession(sessionId) {
    try {
      // Get sessions from storage
      const storage = await chrome.storage.local.get(['sessions']);
      let sessions = storage.sessions || [];
      
      // Decrypt sessions
      sessions = await decryptData(sessions);
      
      // Find the session
      const sessionIndex = sessions.findIndex(s => s.id === sessionId);
      
      // If session not found, show error
      if (sessionIndex === -1) {
        showError('Session not found.');
        return;
      }
      
      // Prompt for new name
      const newName = prompt('Enter a new name for the session:', sessions[sessionIndex].name);
      
      // If canceled or empty, return
      if (!newName) return;
      
      // Update session name
      sessions[sessionIndex].name = newName;
      
      // Encrypt sessions
      const encryptedSessions = await encryptData(sessions);
      
      // Save to storage
      await chrome.storage.local.set({ sessions: encryptedSessions });
      
      // Show success message
      showMessage('Session renamed successfully!');
      
      // Reload sessions
      loadSessions();
    } catch (error) {
      console.error('Error renaming session:', error);
      showError('Failed to rename session. See console for details.');
    }
  }
  
  // Function to delete a session
  async function deleteSession(sessionId) {
    try {
      // Get sessions from storage
      const storage = await chrome.storage.local.get(['sessions']);
      let sessions = storage.sessions || [];
      
      // Decrypt sessions
      sessions = await decryptData(sessions);
      
      // Find the session
      const sessionIndex = sessions.findIndex(s => s.id === sessionId);
      
      // If session not found, show error
      if (sessionIndex === -1) {
        showError('Session not found.');
        return;
      }
      
      // Confirm delete
      const confirmDelete = confirm(`Delete session "${sessions[sessionIndex].name}"?`);
      
      // If not confirmed, return
      if (!confirmDelete) return;
      
      // Remove the session
      sessions.splice(sessionIndex, 1);
      
      // Encrypt sessions
      const encryptedSessions = await encryptData(sessions);
      
      // Save to storage
      await chrome.storage.local.set({ sessions: encryptedSessions });
      
      // Show success message
      showMessage('Session deleted successfully!');
      
      // Reload sessions
      loadSessions();
    } catch (error) {
      console.error('Error deleting session:', error);
      showError('Failed to delete session. See console for details.');
    }
  }
  
  // Function to show a message
  function showMessage(message) {
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = 'dashboard-message';
    messageElement.textContent = message;
    messageElement.style.position = 'fixed';
    messageElement.style.top = '20px';
    messageElement.style.right = '20px';
    messageElement.style.backgroundColor = '#4285f4';
    messageElement.style.color = 'white';
    messageElement.style.padding = '10px 20px';
    messageElement.style.borderRadius = '4px';
    messageElement.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
    messageElement.style.zIndex = '1000';
    messageElement.style.opacity = '0';
    messageElement.style.transition = 'opacity 0.3s';
    
    // Add to body
    document.body.appendChild(messageElement);
    
    // Show message
    setTimeout(() => {
      messageElement.style.opacity = '1';
    }, 0);
    
    // Hide message after 3 seconds
    setTimeout(() => {
      messageElement.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(messageElement);
      }, 300);
    }, 3000);
  }
  
  // Function to show an error
  function showError(message) {
    // Create error element
    const errorElement = document.createElement('div');
    errorElement.className = 'dashboard-error';
    errorElement.textContent = message;
    errorElement.style.position = 'fixed';
    errorElement.style.top = '20px';
    errorElement.style.right = '20px';
    errorElement.style.backgroundColor = '#ea4335';
    errorElement.style.color = 'white';
    errorElement.style.padding = '10px 20px';
    errorElement.style.borderRadius = '4px';
    errorElement.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
    errorElement.style.zIndex = '1000';
    errorElement.style.opacity = '0';
    errorElement.style.transition = 'opacity 0.3s';
    
    // Add to body
    document.body.appendChild(errorElement);
    
    // Show error
    setTimeout(() => {
      errorElement.style.opacity = '1';
    }, 0);
    
    // Hide error after 5 seconds
    setTimeout(() => {
      errorElement.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(errorElement);
      }, 300);
    }, 5000);
  }
}

// Make init available globally for the dashboard.html page
window.init = init;

// Initialize the dashboard when the page loads - This is now handled by dashboard-init.js
// document.addEventListener('DOMContentLoaded', init);
