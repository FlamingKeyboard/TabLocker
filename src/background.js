// Import LZString for compression
import * as LZString from 'lz-string';

// Initialize the extension when installed
chrome.runtime.onInstalled.addListener(async () => {
  console.log('TabLocker extension installed');
  
  // Initialize the encryption key if it doesn't exist
  const storage = await chrome.storage.local.get('encryptionKeyExists');
  if (!storage.encryptionKeyExists) {
    await generateAndStoreEncryptionKey();
  }
  
  // Add context menu item to open the dashboard
  chrome.contextMenus.create({
    id: 'open-dashboard',
    title: 'Open TabLocker Dashboard',
    contexts: ['action']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === 'open-dashboard') {
    chrome.tabs.create({
      url: chrome.runtime.getURL('dashboard.html')
    });
  }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-dashboard') {
    chrome.tabs.create({
      url: chrome.runtime.getURL('dashboard.html')
    });
  }
});

// Generate a secure encryption key using Web Crypto API
export async function generateAndStoreEncryptionKey() {
  try {
    // Generate a random AES-256 key
    const key = await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );
    
    // Export the key to raw format
    const rawKey = await crypto.subtle.exportKey('raw', key);
    
    // Store a flag indicating that the key exists (not the actual key for security)
    await chrome.storage.local.set({ 
      encryptionKeyExists: true,
      // Store the key in a secure format
      encryptionKey: Array.from(new Uint8Array(rawKey))
    });
    
    console.log('Encryption key generated and stored');
  } catch (error) {
    console.error('Error generating encryption key:', error);
    throw error;
  }
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'saveTabs') {
    saveTabs(message.tabs)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Indicates async response
  }
  
  if (message.action === 'getTabs') {
    getSavedTabs()
      .then(tabs => sendResponse({ success: true, tabs }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Indicates async response
  }
  
  if (message.action === 'exportTabs') {
    exportTabs(message.sessionId)
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Indicates async response
  }
  
  if (message.action === 'importTabs') {
    importTabs(message.data)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Indicates async response
  }
  
  if (message.action === 'updateSessions') {
    updateSessions(message.sessions)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Indicates async response
  }
});

// Save tabs to storage with encryption
export async function saveTabs(tabs) {
  try {
    // Get the encryption key
    const storage = await chrome.storage.local.get('encryptionKey');
    if (!storage.encryptionKey) {
      throw new Error('Encryption key not found');
    }
    
    // Convert the stored array back to Uint8Array
    const keyData = new Uint8Array(storage.encryptionKey);
    
    // Import the key
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM', length: 256 },
      false, // not extractable
      ['encrypt', 'decrypt']
    );
    
    // Prepare the data to be encrypted
    const tabsData = JSON.stringify(tabs);
    
    // Compress the data using LZString
    const compressedData = LZString.compress(tabsData);
    
    // Convert to ArrayBuffer for encryption
    const dataToEncrypt = new TextEncoder().encode(compressedData);
    
    // Generate a random IV (Initialization Vector)
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt the data
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      dataToEncrypt
    );
    
    // Convert the encrypted data to a format that can be stored
    const encryptedArray = Array.from(new Uint8Array(encryptedData));
    const ivArray = Array.from(iv);
    
    // Get existing saved sessions
    const existingData = await chrome.storage.local.get('savedSessions');
    const savedSessions = existingData.savedSessions || [];
    
    // Create a new session
    const newSession = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      tabCount: tabs.length,
      encryptedData: encryptedArray,
      iv: ivArray
    };
    
    // Add the new session to the saved sessions
    savedSessions.push(newSession);
    
    // Save to storage
    await chrome.storage.local.set({ savedSessions });
    
    return { sessionId: newSession.id, tabCount: tabs.length };
  } catch (error) {
    console.error('Error saving tabs:', error);
    throw error;
  }
}

// Get saved tabs from storage with decryption
export async function getSavedTabs() {
  try {
    // Get the encryption key
    const storage = await chrome.storage.local.get(['encryptionKey', 'savedSessions']);
    if (!storage.encryptionKey) {
      throw new Error('Encryption key not found');
    }
    
    // If no saved sessions, return empty array
    if (!storage.savedSessions || storage.savedSessions.length === 0) {
      return [];
    }
    
    // Convert the stored array back to Uint8Array
    const keyData = new Uint8Array(storage.encryptionKey);
    
    // Import the key
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM', length: 256 },
      false, // not extractable
      ['encrypt', 'decrypt']
    );
    
    // Process each saved session
    const sessions = [];
    for (const session of storage.savedSessions) {
      try {
        // Convert the stored arrays back to Uint8Array
        const encryptedData = new Uint8Array(session.encryptedData);
        const iv = new Uint8Array(session.iv);
        
        // Decrypt the data
        const decryptedData = await crypto.subtle.decrypt(
          {
            name: 'AES-GCM',
            iv: iv
          },
          key,
          encryptedData
        );
        
        // Decode the decrypted data
        const decodedData = new TextDecoder().decode(decryptedData);
        
        // Decompress the data
        const decompressedData = LZString.decompress(decodedData);
        
        // Parse the JSON data
        const tabs = JSON.parse(decompressedData);
        
        sessions.push({
          id: session.id,
          date: session.date,
          tabs: tabs
        });
      } catch (error) {
        console.error(`Error decrypting session ${session.id}:`, error);
        // Skip this session if there's an error
      }
    }
    
    return sessions;
  } catch (error) {
    console.error('Error getting saved tabs:', error);
    throw error;
  }
}

// Export tabs to a file
export async function exportTabs(sessionId) {
  try {
    // Get all saved sessions
    const sessions = await getSavedTabs();
    
    // Find the requested session
    const session = sessions.find(s => s.id === sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    // Prepare the data for export
    const exportData = {
      version: '1.0',
      date: new Date().toISOString(),
      session: session
    };
    
    // Convert to JSON and compress
    const jsonData = JSON.stringify(exportData);
    const compressedData = LZString.compressToUTF16(jsonData);
    
    return compressedData;
  } catch (error) {
    console.error('Error exporting tabs:', error);
    throw error;
  }
}

// Import tabs from a file
export async function importTabs(importData) {
  try {
    // Decompress the data
    const decompressedData = LZString.decompressFromUTF16(importData);
    if (!decompressedData) {
      throw new Error('Invalid import data');
    }
    
    // Parse the JSON data
    const parsedData = JSON.parse(decompressedData);
    
    // Validate the data
    if (!parsedData.version || !parsedData.session || !parsedData.session.tabs) {
      throw new Error('Invalid import data format');
    }
    
    // Save the imported tabs
    const result = await saveTabs(parsedData.session.tabs);
    
    return {
      sessionId: result.sessionId,
      tabCount: result.tabCount
    };
  } catch (error) {
    console.error('Error importing tabs:', error);
    throw error;
  }
}

// Update sessions after reordering tabs
export async function updateSessions(updatedSessions) {
  try {
    // Get the encryption key and existing sessions
    const storage = await chrome.storage.local.get(['encryptionKey', 'savedSessions']);
    if (!storage.encryptionKey) {
      throw new Error('Encryption key not found');
    }
    
    // Convert the stored array back to Uint8Array
    const keyData = new Uint8Array(storage.encryptionKey);
    
    // Import the key
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM', length: 256 },
      false, // not extractable
      ['encrypt', 'decrypt']
    );
    
    // Get the existing saved sessions
    const savedSessions = storage.savedSessions || [];
    
    // Create a map of session IDs to their indices
    const sessionIndexMap = {};
    savedSessions.forEach((session, index) => {
      sessionIndexMap[session.id] = index;
    });
    
    // Update each session that has been modified
    for (const updatedSession of updatedSessions) {
      // Find the index of this session in the saved sessions array
      const sessionIndex = sessionIndexMap[updatedSession.id];
      
      if (sessionIndex !== undefined) {
        // Prepare the data to be encrypted
        const tabsData = JSON.stringify(updatedSession.tabs);
        
        // Compress the data using LZString
        const compressedData = LZString.compress(tabsData);
        
        // Convert to ArrayBuffer for encryption
        const dataToEncrypt = new TextEncoder().encode(compressedData);
        
        // Generate a random IV (Initialization Vector)
        const iv = crypto.getRandomValues(new Uint8Array(12));
        
        // Encrypt the data
        const encryptedData = await crypto.subtle.encrypt(
          {
            name: 'AES-GCM',
            iv: iv
          },
          key,
          dataToEncrypt
        );
        
        // Convert the encrypted data to a format that can be stored
        const encryptedArray = Array.from(new Uint8Array(encryptedData));
        const ivArray = Array.from(iv);
        
        // Update the session with the new encrypted data
        savedSessions[sessionIndex] = {
          ...savedSessions[sessionIndex],
          tabCount: updatedSession.tabs.length,
          encryptedData: encryptedArray,
          iv: ivArray
        };
      }
    }
    
    // Save the updated sessions back to storage
    await chrome.storage.local.set({ savedSessions });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating sessions:', error);
    throw error;
  }
}
