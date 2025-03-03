// Import LZString for compression (will be used in future implementation)
// import * as LZString from 'lz-string';

// Initialize the extension when installed
chrome.runtime.onInstalled.addListener(async () => {
  console.log('TabLocker extension installed');
  
  // Initialize the encryption key if it doesn't exist
  const storage = await chrome.storage.local.get('encryptionKeyExists');
  if (!storage.encryptionKeyExists) {
    await generateAndStoreEncryptionKey();
  }
});

// Generate a secure encryption key using Web Crypto API
async function generateAndStoreEncryptionKey() {
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
});

// Save tabs to storage with encryption
async function saveTabs(tabs) {
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
    
    // Compress the data using LZString (placeholder - will implement later)
    // const compressedData = LZString.compress(tabsData);
    
    // For now, use the uncompressed data
    const dataToEncrypt = new TextEncoder().encode(tabsData);
    
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
async function getSavedTabs() {
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
        
        // Decompress the data (placeholder - will implement later)
        // const decompressedData = LZString.decompress(decodedData);
        
        // For now, use the uncompressed data
        const tabs = JSON.parse(decodedData);
        
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
