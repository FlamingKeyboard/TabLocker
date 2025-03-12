/**
 * Tab Service
 * 
 * Provides functions for managing browser tabs, including
 * saving current tabs, restoring tabs, and working with tab groups.
 */

class TabService {
  /**
   * Get all tabs from the current window
   * @returns {Promise<Array>} - Array of tab objects
   */
  async getCurrentWindowTabs() {
    return new Promise((resolve) => {
      chrome.tabs.query({ currentWindow: true }, (tabs) => {
        // Filter out the extension's own tabs
        const filteredTabs = tabs.filter(tab => {
          return !tab.url.startsWith('chrome-extension://') && 
                 !tab.url.startsWith('moz-extension://') &&
                 !tab.url.startsWith('edge-extension://') &&
                 !tab.url.startsWith('opera-extension://');
        });
        
        // Map tabs to a simpler structure
        const simpleTabs = filteredTabs.map(tab => ({
          id: tab.id,
          url: tab.url,
          title: tab.title,
          favIconUrl: tab.favIconUrl || null,
          pinned: tab.pinned || false,
          groupId: tab.groupId !== undefined ? tab.groupId : -1
        }));
        
        resolve(simpleTabs);
      });
    });
  }
  
  /**
   * Get all tabs from all windows
   * @returns {Promise<Array>} - Array of tab objects grouped by window
   */
  async getAllWindowsTabs() {
    return new Promise((resolve) => {
      chrome.tabs.query({}, (tabs) => {
        // Group tabs by windowId
        const tabsByWindow = tabs.reduce((acc, tab) => {
          // Filter out extension tabs
          if (tab.url.startsWith('chrome-extension://') || 
              tab.url.startsWith('moz-extension://') ||
              tab.url.startsWith('edge-extension://') ||
              tab.url.startsWith('opera-extension://')) {
            return acc;
          }
          
          if (!acc[tab.windowId]) {
            acc[tab.windowId] = [];
          }
          
          acc[tab.windowId].push({
            id: tab.id,
            url: tab.url,
            title: tab.title,
            favIconUrl: tab.favIconUrl || null,
            pinned: tab.pinned || false,
            groupId: tab.groupId !== undefined ? tab.groupId : -1
          });
          
          return acc;
        }, {});
        
        resolve(Object.values(tabsByWindow));
      });
    });
  }
  
  /**
   * Get the browser's tab groups (Chrome/Edge feature)
   * @returns {Promise<Object>} - Object mapping group IDs to group info
   */
  async getTabGroups() {
    // Check if the tabGroups API is available
    if (!chrome.tabGroups) {
      return {};
    }
    
    return new Promise((resolve) => {
      chrome.tabGroups.query({}, (groups) => {
        const groupsMap = groups.reduce((acc, group) => {
          acc[group.id] = {
            name: group.title || '',
            color: group.color || 'grey'
          };
          return acc;
        }, {});
        
        resolve(groupsMap);
      });
    });
  }
  
  /**
   * Close tabs after saving them
   * @param {Array} tabIds - Array of tab IDs to close
   * @returns {Promise<void>}
   */
  async closeTabs(tabIds) {
    return new Promise((resolve) => {
      chrome.tabs.remove(tabIds, () => {
        resolve();
      });
    });
  }
  
  /**
   * Create a new tab with the given URL
   * @param {string} url - URL to open
   * @param {boolean} active - Whether the new tab should be active
   * @returns {Promise<chrome.tabs.Tab>} - The created tab
   */
  async createTab(url, active = true) {
    return new Promise((resolve) => {
      chrome.tabs.create({ url, active }, (tab) => {
        resolve(tab);
      });
    });
  }
  
  /**
   * Restore a list of tabs
   * @param {Array} tabs - Array of tab objects with URLs
   * @param {boolean} keepSaved - Whether to keep the tabs in storage after restoring
   * @returns {Promise<Array>} - Array of created tabs
   */
  async restoreTabs(tabs, keepSaved = false) {
    const createdTabs = [];
    
    // Create tabs one by one to maintain order
    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      const active = i === 0; // Make the first tab active
      
      const createdTab = await this.createTab(tab.url, active);
      createdTabs.push(createdTab);
    }
    
    return createdTabs;
  }
  
  /**
   * Check if a tab is pinned
   * @param {number} tabId - ID of the tab to check
   * @returns {Promise<boolean>} - Whether the tab is pinned
   */
  async isTabPinned(tabId) {
    return new Promise((resolve) => {
      chrome.tabs.get(tabId, (tab) => {
        resolve(tab.pinned || false);
      });
    });
  }
  
  /**
   * Format tab information for displaying in the UI
   * @param {Object} tab - Tab object
   * @returns {Object} - Formatted tab object
   */
  formatTabForDisplay(tab) {
    // Extract domain from URL
    let domain = '';
    try {
      const url = new URL(tab.url);
      domain = url.hostname;
    } catch (e) {
      // Invalid URL, use the full URL as domain
      domain = tab.url;
    }
    
    return {
      ...tab,
      domain,
      shortTitle: this.truncateString(tab.title, 50)
    };
  }
  
  /**
   * Truncate a string to a given length
   * @param {string} str - String to truncate
   * @param {number} length - Maximum length
   * @returns {string} - Truncated string
   */
  truncateString(str, length) {
    if (!str) return '';
    
    if (str.length <= length) {
      return str;
    }
    
    return str.substring(0, length) + '...';
  }
}

export default TabService;
