/**
 * TabLocker Background Script
 * 
 * Handles browser events and tab management in the background.
 * This script runs as a service worker in Manifest V3.
 */

import StorageService from '../services/StorageService';
import TabService from '../services/TabService';

// Initialize services
let storageService = null;
const tabService = new TabService();

// Store services initialization state
let isInitialized = false;

/**
 * Initialize the extension services
 */
async function initializeServices() {
  if (isInitialized) return;
  
  try {
    // Get password from storage if it exists
    const passwordFromStorage = await chrome.storage.local.get('password');
    let password = passwordFromStorage.password || null;
    
    // If no password is set, create a default one and save it
    if (!password) {
      password = 'default-' + crypto.randomUUID();
      await chrome.storage.local.set({ password });
      console.log('Default encryption password created');
    }
    
    // Initialize storage service with the password
    storageService = new StorageService(password);
    
    isInitialized = true;
    console.log('TabLocker services initialized');
  } catch (error) {
    console.error('Error initializing TabLocker services:', error);
  }
}

/**
 * Save tabs from the current window
 */
async function saveCurrentWindowTabs() {
  try {
    await initializeServices();
    
    // Get current tabs
    const tabs = await tabService.getCurrentWindowTabs();
    
    if (tabs.length === 0) {
      console.log('No tabs to save');
      return;
    }
    
    // Get tab groups if available
    const tabGroups = await tabService.getTabGroups();
    
    // Create tab group object
    const tabGroup = {
      tabs,
      tabGroups,
      created: Date.now(),
      name: `Tabs from ${new Date().toLocaleString()}`
    };
    
    // Save to storage
    const groupId = await storageService.saveTabGroup(tabGroup);
    console.log(`Saved ${tabs.length} tabs with ID: ${groupId}`);
    
    // Check if we should close tabs after saving
    const settings = await chrome.storage.local.get('closeTabsAfterSave');
    if (settings.closeTabsAfterSave) {
      const tabIds = tabs.map(tab => tab.id);
      await tabService.closeTabs(tabIds);
    }
    
    return groupId;
  } catch (error) {
    console.error('Error saving tabs:', error);
    throw error;
  }
}

/**
 * Handle browser action click (toolbar icon)
 */
chrome.action.onClicked.addListener(async (tab) => {
  try {
    await saveCurrentWindowTabs();
    
    // Open the popup to show the saved tabs
    chrome.runtime.openOptionsPage();
  } catch (error) {
    console.error('Error handling browser action click:', error);
  }
});

/**
 * Handle extension installation or update
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // Create a default password on install
    const defaultPassword = 'default-' + crypto.randomUUID();
    
    // Set default settings on install
    await chrome.storage.local.set({
      closeTabsAfterSave: false,
      usePinProtection: false,
      autoBackup: true,
      password: defaultPassword
    });
    
    // Open options page on install
    chrome.runtime.openOptionsPage();
  }
});

/**
 * Listen for messages from the popup and options pages
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      await initializeServices();
      
      switch (message.action) {
        case 'saveTabs':
          const groupId = await saveCurrentWindowTabs();
          sendResponse({ success: true, groupId });
          break;
          
        case 'restoreTabs':
          const { tabs, keepSaved } = message.data;
          const restoredTabs = await tabService.restoreTabs(tabs, keepSaved);
          sendResponse({ success: true, count: restoredTabs.length });
          break;
          
        case 'setPassword':
          if (storageService) {
            storageService.setPassword(message.password);
            await chrome.storage.local.set({ password: message.password });
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'Storage service not initialized' });
          }
          break;
          
        case 'getOptions':
          const options = await chrome.storage.local.get([
            'closeTabsAfterSave', 
            'usePinProtection',
            'autoBackup',
            'password',
            'pin'
          ]);
          sendResponse({ success: true, options });
          break;
          
        case 'setOptions':
          await chrome.storage.local.set(message.options);
          
          // Update the storage service with the new password if it was changed
          if (message.options.password && storageService) {
            storageService.setPassword(message.options.password);
          }
          
          sendResponse({ success: true });
          break;
          
        case 'getTabGroup':
          try {
            if (!storageService) {
              throw new Error('Storage service not initialized');
            }
            const group = await storageService.getTabGroup(message.id);
            if (!group) {
              throw new Error(`Tab group with ID ${message.id} not found`);
            }
            sendResponse({ success: true, group });
          } catch (error) {
            console.error(`Error getting tab group ${message.id}:`, error);
            sendResponse({ success: false, error: error.message });
          }
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error(`Error handling message ${message.action}:`, error);
      sendResponse({ success: false, error: error.message });
    }
  })();
  
  // Return true to indicate we'll send a response asynchronously
  return true;
});

// Initialize services when the background script loads
initializeServices();
