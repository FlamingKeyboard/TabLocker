/**
 * Storage Service
 * 
 * Manages IndexedDB storage for tab collections and settings.
 * All data is stored locally on the user's device.
 */

import CompressionService from './CompressionService';
import EncryptionService from './EncryptionService';

class StorageService {
  /**
   * Initialize the storage service
   * @param {string} password - Optional password for encryption
   */
  constructor(password = null) {
    this.dbName = 'TabLockerDB';
    this.dbVersion = 3;
    this.db = null;
    this.isReady = false;
    this.compressionService = new CompressionService();
    this.encryptionService = new EncryptionService(password);
    
    this.initializeDB();
  }
  
  /**
   * Set password for encryption/decryption
   * @param {string} password - Password to use
   */
  setPassword(password) {
    this.encryptionService.setPassword(password);
  }
  
  /**
   * Initialize IndexedDB
   * @returns {Promise<IDBDatabase>} - IndexedDB database instance
   */
  async initializeDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const oldVersion = event.oldVersion;
        
        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains('tabGroups')) {
          const tabGroupsStore = db.createObjectStore('tabGroups', { keyPath: 'id' });
          tabGroupsStore.createIndex('created', 'created', { unique: false });
          tabGroupsStore.createIndex('name', 'name', { unique: false });
          tabGroupsStore.createIndex('orderIndex', 'orderIndex', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
        
        // For version 3, add tags support
        if (oldVersion < 3) {
          // Create tags store if it doesn't exist
          if (!db.objectStoreNames.contains('tags')) {
            const tagsStore = db.createObjectStore('tags', { keyPath: 'id' });
            tagsStore.createIndex('name', 'name', { unique: true });
            tagsStore.createIndex('created', 'created', { unique: false });
          }
          
          // Add 'tags' index to tabGroups if it doesn't exist
          const tabGroupsStore = request.transaction.objectStore('tabGroups');
          if (!tabGroupsStore.indexNames.contains('tags')) {
            tabGroupsStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
          }
        }
      };
      
      request.onsuccess = (event) => {
        this.db = event.target.result;
        this.isReady = true;
        resolve(this.db);
      };
      
      request.onerror = (event) => {
        console.error('Error opening IndexedDB:', event.target.error);
        reject(event.target.error);
      };
    });
  }
  
  /**
   * Ensure the database is ready
   * @returns {Promise<IDBDatabase>} - IndexedDB database instance
   */
  async ensureDBReady() {
    if (this.isReady && this.db) {
      return this.db;
    }
    
    return this.initializeDB();
  }
  
  /**
   * Perform a transaction on the database
   * @param {string} storeName - Name of the object store
   * @param {string} mode - Transaction mode ('readonly' or 'readwrite')
   * @param {Function} callback - Callback with transaction object store
   * @returns {Promise<any>} - Result of the transaction
   */
  async transaction(storeName, mode, callback) {
    await this.ensureDBReady();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = (event) => reject(event.target.error);
      
      const request = callback(store);
      
      if (request) {
        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
      }
    });
  }
  
  /**
   * Save a tab group
   * @param {Object} tabGroup - Tab group to save
   * @returns {Promise<string>} - ID of the saved tab group
   */
  async saveTabGroup(tabGroup) {
    try {
      // Ensure tabGroup has required fields
      if (!tabGroup.id) {
        tabGroup.id = crypto.randomUUID();
      }
      
      if (!tabGroup.created) {
        tabGroup.created = Date.now();
      }
      
      if (!tabGroup.name) {
        tabGroup.name = `Tabs from ${new Date(tabGroup.created).toLocaleString()}`;
      }
      
      // Create a deep copy of the tab group to avoid modifying the original
      const tabGroupToStore = JSON.parse(JSON.stringify(tabGroup));
      
      // Make sure we have tabs to store
      if (!tabGroupToStore.tabs || !Array.isArray(tabGroupToStore.tabs)) {
        console.error('No tabs array found in tab group:', tabGroupToStore);
        throw new Error('No tabs to save');
      }
      
      // Compress and encrypt the tabs data
      // First convert to string
      const tabsJson = JSON.stringify(tabGroupToStore.tabs);
      const compressedTabs = this.compressionService.compress(tabsJson);
      
      // Ensure we have a password for encryption
      if (!this.encryptionService.password) {
        const passwordFromStorage = await chrome.storage.local.get('password');
        if (passwordFromStorage.password) {
          this.setPassword(passwordFromStorage.password);
        } else {
          throw new Error('No password set for encryption');
        }
      }
      
      tabGroupToStore.encryptedTabs = await this.encryptionService.encrypt(compressedTabs);
      
      // Don't store the raw tabs in the database
      delete tabGroupToStore.tabs;
      
      // Save to IndexedDB
      await this.transaction('tabGroups', 'readwrite', (store) => {
        return store.put(tabGroupToStore);
      });
      
      console.log(`Successfully saved tab group with ID: ${tabGroupToStore.id}`, tabGroupToStore);
      return tabGroupToStore.id;
    } catch (error) {
      console.error('Error saving tab group:', error);
      throw new Error(`Failed to save tabs: ${error.message}`);
    }
  }
  
  /**
   * Get a tab group by ID
   * @param {string} id - ID of the tab group
   * @returns {Promise<Object>} - Decrypted tab group
   */
  async getTabGroup(id) {
    try {
      const tabGroup = await this.transaction('tabGroups', 'readonly', (store) => {
        return store.get(id);
      });
      
      if (!tabGroup) {
        return null;
      }
      
      // Ensure we have a password for decryption
      if (!this.encryptionService.password) {
        const passwordFromStorage = await chrome.storage.local.get('password');
        if (passwordFromStorage.password) {
          this.setPassword(passwordFromStorage.password);
        } else {
          throw new Error('No password set for decryption');
        }
      }
      
      // Decrypt and decompress the tabs data
      if (tabGroup.encryptedTabs) {
        try {
          const decryptedTabs = await this.encryptionService.decrypt(tabGroup.encryptedTabs);
          if (!decryptedTabs) {
            throw new Error('Failed to decrypt tab data');
          }
          
          const decompressedTabs = this.compressionService.decompress(decryptedTabs);
          if (!decompressedTabs) {
            throw new Error('Failed to decompress tab data');
          }
          
          // Handle both string and object data formats
          if (typeof decompressedTabs === 'string') {
            try {
              tabGroup.tabs = JSON.parse(decompressedTabs);
            } catch (e) {
              console.error('Error parsing decompressed tabs:', e);
              throw new Error('Invalid tab data format');
            }
          } else {
            tabGroup.tabs = decompressedTabs;
          }
          
          return tabGroup;
        } catch (error) {
          console.error('Error decrypting tab group:', error);
          throw new Error(`Unable to decrypt tab group: ${error.message}`);
        }
      } else {
        throw new Error('No encrypted tab data found');
      }
    } catch (error) {
      console.error('Error retrieving tab group:', error);
      throw new Error(`Failed to retrieve tab group: ${error.message}`);
    }
  }
  
  /**
   * Get all tab groups (metadata only, without decrypted tabs)
   * @returns {Promise<Array>} - Array of tab groups
   */
  async getAllTabGroups() {
    return new Promise(async (resolve, reject) => {
      await this.ensureDBReady();
      
      const transaction = this.db.transaction('tabGroups', 'readonly');
      const store = transaction.objectStore('tabGroups');
      const request = store.index('created').openCursor(null, 'prev'); // Initially get by created date
      
      const tabGroups = [];
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          // Don't include the encrypted tabs data in the list
          const tabGroup = { ...cursor.value };
          delete tabGroup.encryptedTabs;
          
          tabGroups.push(tabGroup);
          cursor.continue();
        } else {
          // Sort by orderIndex if available, otherwise keep created date sort
          const sortedGroups = tabGroups.sort((a, b) => {
            // If both have orderIndex, sort by that
            if (a.orderIndex !== undefined && b.orderIndex !== undefined) {
              return a.orderIndex - b.orderIndex;
            }
            // If only one has orderIndex, prioritize the one with orderIndex
            if (a.orderIndex !== undefined) return -1;
            if (b.orderIndex !== undefined) return 1;
            // Default to sorting by created date (newest first) as fallback
            return b.created - a.created;
          });
          
          resolve(sortedGroups);
        }
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }
  
  /**
   * Delete a tab group
   * @param {string} id - ID of the tab group to delete
   * @returns {Promise<void>}
   */
  async deleteTabGroup(id) {
    return this.transaction('tabGroups', 'readwrite', (store) => {
      return store.delete(id);
    });
  }
  
  /**
   * Update a tab group
   * @param {string} id - ID of the tab group to update
   * @param {Object} updates - Fields to update
   * @returns {Promise<void>}
   */
  async updateTabGroup(id, updates) {
    const tabGroup = await this.getTabGroup(id);
    
    if (!tabGroup) {
      throw new Error('Tab group not found');
    }
    
    // Merge updates with existing tab group
    Object.assign(tabGroup, updates);
    
    // Save the updated tab group
    return this.saveTabGroup(tabGroup);
  }
  
  /**
   * Search tab groups
   * @param {string} query - Search query
   * @returns {Promise<Array>} - Array of matching tab groups with tab counts
   */
  async searchTabGroups(query) {
    console.log('=== SEARCH DEBUG START ===');
    console.log(`Raw search query: "${query}"`);
    
    if (!query || query.trim() === '') {
      console.log('Empty query - returning all tab groups');
      return this.getAllTabGroups();
    }
    
    const allTabGroups = await this.getAllTabGroups();
    console.log(`Total groups to search: ${allTabGroups.length}`);
    
    // Log structure of first group as sample (if available)
    if (allTabGroups.length > 0) {
      console.log('Sample group structure:', JSON.stringify(allTabGroups[0], null, 2));
    }
    
    const lowerQuery = query.toLowerCase().trim();
    console.log(`Normalized search query: "${lowerQuery}"`);
    
    // First search in metadata (which doesn't require decryption)
    const metadataMatches = [];
    
    for (const group of allTabGroups) {
      let isMatch = false;
      let matchReason = '';
      
      // Check group name - case-insensitive string match
      if (group.name && group.name.toLowerCase().indexOf(lowerQuery) !== -1) {
        isMatch = true;
        matchReason = `Group name match: "${group.name}" contains "${lowerQuery}"`;
      }
      
      // Check date/time (formatted as string)
      if (!isMatch && group.created) {
        const dateStr = new Date(group.created).toLocaleString().toLowerCase();
        console.log(`Group ${group.id} date string: "${dateStr}"`);
        if (dateStr.indexOf(lowerQuery) !== -1) {
          isMatch = true;
          matchReason = `Date/time match: "${dateStr}" contains "${lowerQuery}"`;
        }
      }

      if (isMatch) {
        metadataMatches.push({
          ...group,
          tabCount: group.tabCount || 0, // Include tab count for UI
          _matchReason: matchReason,    // For debugging
          matchInfo: {
            field: group.name && group.name.toLowerCase().indexOf(lowerQuery) !== -1 ? 'name' : 'date',
            text: group.name && group.name.toLowerCase().indexOf(lowerQuery) !== -1 ? group.name : new Date(group.created).toLocaleString(),
            query: lowerQuery
          }
        });
        console.log(`✓ Metadata match for group ${group.id}: ${matchReason}`);
      } else {
        console.log(`✗ No metadata match for group ${group.id}`);
      }
    }
    
    console.log(`Metadata matches found: ${metadataMatches.length}`);
    
    // Get the IDs of groups that didn't match by metadata
    const idsToSearch = allTabGroups
      .filter(group => !metadataMatches.some(match => match.id === group.id))
      .map(group => group.id);
    
    console.log(`Groups to search in tab content: ${idsToSearch.length}`);
    
    // Search inside the encrypted tabs content
    const contentMatches = [];
    
    for (const id of idsToSearch) {
      try {
        console.log(`Searching inside tab content for group ${id}...`);
        const group = await this.getTabGroup(id);
        
        if (!group) {
          console.log(`Group ${id} not found`);
          continue;
        }
        
        if (!group.tabs) {
          console.log(`Group ${id} has no tabs array`);
          continue;
        }
        
        console.log(`Group ${id} has ${group.tabs.length} tabs to search`);
        const tabCount = group.tabs.length; // Store tab count for UI display
        
        // Check if any tab title or URL matches the query
        let foundMatch = false;
        let matchReason = '';
        
        for (let i = 0; i < group.tabs.length; i++) {
          const tab = group.tabs[i];
          
          // Check tab title - case-insensitive string match
          if (tab.title && tab.title.toLowerCase().indexOf(lowerQuery) !== -1) {
            foundMatch = true;
            matchReason = `Tab ${i} title match: "${tab.title}" contains "${lowerQuery}"`;
            break;
          }
          
          // Check tab URL - case-insensitive string match
          if (tab.url && tab.url.toLowerCase().indexOf(lowerQuery) !== -1) {
            foundMatch = true;
            matchReason = `Tab ${i} URL match: "${tab.url}" contains "${lowerQuery}"`;
            break;
          }

          // Check tab saved date/time if available
          if (tab.savedAt) {
            const tabDateStr = new Date(tab.savedAt).toLocaleString().toLowerCase();
            console.log(`Tab ${i} date string: "${tabDateStr}"`);
            if (tabDateStr.indexOf(lowerQuery) !== -1) {
              foundMatch = true;
              matchReason = `Tab ${i} date match: "${tabDateStr}" contains "${lowerQuery}"`;
              break;
            }
          }
        }
        
        if (foundMatch) {
          // Create a result with just the metadata we need (not the full tabs data)
          // We need to construct a new object with just what's needed for display
          // Determine which field and text matched for highlighting
          let matchField = '';
          let matchText = '';
          
          for (let i = 0; i < group.tabs.length; i++) {
            const tab = group.tabs[i];
            if (tab.title && tab.title.toLowerCase().indexOf(lowerQuery) !== -1) {
              matchField = 'title';
              matchText = tab.title;
              break;
            } else if (tab.url && tab.url.toLowerCase().indexOf(lowerQuery) !== -1) {
              matchField = 'url';
              matchText = tab.url;
              break;
            } else if (tab.savedAt && new Date(tab.savedAt).toLocaleString().toLowerCase().indexOf(lowerQuery) !== -1) {
              matchField = 'date';
              matchText = new Date(tab.savedAt).toLocaleString();
              break;
            }
          }
          
          const matchGroup = {
            id: group.id,
            name: group.name,
            created: group.created,
            orderIndex: group.orderIndex,
            tabCount: tabCount,
            _matchReason: matchReason, // For debugging
            matchInfo: {
              field: matchField, 
              text: matchText,
              query: lowerQuery
            }
          };
          
          contentMatches.push(matchGroup);
          console.log(`✓ Content match for group ${id}: ${matchReason}`);
        } else {
          console.log(`✗ No content match for group ${id}`);
        }
      } catch (error) {
        console.error(`Error searching tab group ${id}:`, error);
        // Continue to next group if there's an error
      }
    }
    
    console.log(`Content matches found: ${contentMatches.length}`);
    
    // Combine and deduplicate results
    const allMatches = [...metadataMatches];
    
    for (const match of contentMatches) {
      if (!allMatches.some(existingMatch => existingMatch.id === match.id)) {
        allMatches.push(match);
      }
    }
    
    console.log(`Total matches after deduplication: ${allMatches.length}`);
    console.log('Search results:', allMatches);
    console.log('=== SEARCH DEBUG END ===');
    
    return allMatches;
  }
  
  /**
   * Save a setting
   * @param {string} key - Setting key
   * @param {any} value - Setting value
   * @returns {Promise<void>}
   */
  async saveSetting(key, value) {
    return this.transaction('settings', 'readwrite', (store) => {
      return store.put({ key, value });
    });
  }
  
  /**
   * Get a setting
   * @param {string} key - Setting key
   * @returns {Promise<any>} - Setting value
   */
  async getSetting(key) {
    const result = await this.transaction('settings', 'readonly', (store) => {
      return store.get(key);
    });
    
    return result ? result.value : null;
  }
  
  /**
   * Clear all data (for debugging or reset)
   * @returns {Promise<void>}
   */
  async clearAllData() {
    await this.ensureDBReady();
    
    const transaction = this.db.transaction(['tabGroups', 'settings', 'tags'], 'readwrite');
    transaction.objectStore('tabGroups').clear();
    transaction.objectStore('settings').clear();
    transaction.objectStore('tags').clear();
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = (event) => reject(event.target.error);
    });
  }

  /**
   * Create a new tag
   * @param {Object} tag - Tag object with name
   * @returns {Promise<string>} - ID of the created tag
   */
  async createTag(tag) {
    try {
      // Ensure tag has required fields
      if (!tag.id) {
        tag.id = crypto.randomUUID();
      }
      
      if (!tag.created) {
        tag.created = Date.now();
      }
      
      if (!tag.name || typeof tag.name !== 'string' || tag.name.trim() === '') {
        throw new Error('Tag must have a valid name');
      }
      
      // Create a clean tag object
      const tagToStore = {
        id: tag.id,
        name: tag.name.trim(),
        created: tag.created,
        color: tag.color || null // Optional color for the tag
      };
      
      // Save to IndexedDB
      await this.transaction('tags', 'readwrite', (store) => {
        return store.put(tagToStore);
      });
      
      console.log(`Successfully created tag with ID: ${tagToStore.id}`, tagToStore);
      return tagToStore.id;
    } catch (error) {
      console.error('Error creating tag:', error);
      throw new Error(`Failed to create tag: ${error.message}`);
    }
  }
  
  /**
   * Get all tags
   * @returns {Promise<Array>} - Array of all tags
   */
  async getAllTags() {
    return new Promise(async (resolve, reject) => {
      await this.ensureDBReady();
      
      const transaction = this.db.transaction('tags', 'readonly');
      const store = transaction.objectStore('tags');
      const request = store.index('name').openCursor();
      
      const tags = [];
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          tags.push(cursor.value);
          cursor.continue();
        } else {
          resolve(tags);
        }
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  /**
   * Get a tag by ID
   * @param {string} id - ID of the tag
   * @returns {Promise<Object|null>} - Tag object or null if not found
   */
  async getTag(id) {
    return this.transaction('tags', 'readonly', (store) => {
      return store.get(id);
    });
  }
  
  /**
   * Update a tag
   * @param {string} id - ID of the tag to update
   * @param {Object} updates - Fields to update
   * @returns {Promise<void>}
   */
  async updateTag(id, updates) {
    const tag = await this.getTag(id);
    
    if (!tag) {
      throw new Error('Tag not found');
    }
    
    // Validate updates
    if (updates.name && (typeof updates.name !== 'string' || updates.name.trim() === '')) {
      throw new Error('Tag name cannot be empty');
    }
    
    // Merge updates with existing tag
    const updatedTag = { ...tag, ...updates };
    if (updates.name) {
      updatedTag.name = updates.name.trim();
    }
    
    // Save the updated tag
    return this.transaction('tags', 'readwrite', (store) => {
      return store.put(updatedTag);
    });
  }
  
  /**
   * Delete a tag
   * @param {string} id - ID of the tag to delete
   * @returns {Promise<void>}
   */
  async deleteTag(id) {
    try {
      // First, remove this tag from all tab groups that reference it
      const allTabGroups = await this.getAllTabGroups();
      
      for (const group of allTabGroups) {
        if (group.tags && group.tags.includes(id)) {
          // Get the full group with tabs
          const fullGroup = await this.getTabGroup(group.id);
          
          // Remove the tag from the group
          fullGroup.tags = fullGroup.tags.filter(tagId => tagId !== id);
          
          // Save the updated group
          await this.saveTabGroup(fullGroup);
        }
      }
      
      // Now delete the tag itself
      return this.transaction('tags', 'readwrite', (store) => {
        return store.delete(id);
      });
    } catch (error) {
      console.error('Error deleting tag:', error);
      throw new Error(`Failed to delete tag: ${error.message}`);
    }
  }
  
  /**
   * Add tags to a tab group
   * @param {string} groupId - ID of the tab group
   * @param {string|string[]} tagIds - Tag ID or array of tag IDs to add
   * @returns {Promise<void>}
   */
  async addTagsToGroup(groupId, tagIds) {
    try {
      // Ensure tagIds is an array
      const tagIdsArray = Array.isArray(tagIds) ? tagIds : [tagIds];
      
      // Validate all tag IDs exist
      for (const tagId of tagIdsArray) {
        const tag = await this.getTag(tagId);
        if (!tag) {
          throw new Error(`Tag with ID ${tagId} does not exist`);
        }
      }
      
      // Get the group
      const group = await this.getTabGroup(groupId);
      if (!group) {
        throw new Error(`Tab group with ID ${groupId} not found`);
      }
      
      // Initialize tags array if it doesn't exist
      if (!group.tags) {
        group.tags = [];
      }
      
      // Add tags that aren't already applied
      let tagsChanged = false;
      for (const tagId of tagIdsArray) {
        if (!group.tags.includes(tagId)) {
          group.tags.push(tagId);
          tagsChanged = true;
        }
      }
      
      // Only save if tags actually changed
      if (tagsChanged) {
        await this.saveTabGroup(group);
      }
      
      return group.tags;
    } catch (error) {
      console.error('Error adding tags to group:', error);
      throw new Error(`Failed to add tags: ${error.message}`);
    }
  }
  
  /**
   * Remove tags from a tab group
   * @param {string} groupId - ID of the tab group
   * @param {string|string[]} tagIds - Tag ID or array of tag IDs to remove
   * @returns {Promise<void>}
   */
  async removeTagsFromGroup(groupId, tagIds) {
    try {
      // Ensure tagIds is an array
      const tagIdsArray = Array.isArray(tagIds) ? tagIds : [tagIds];
      
      // Get the group
      const group = await this.getTabGroup(groupId);
      if (!group) {
        throw new Error(`Tab group with ID ${groupId} not found`);
      }
      
      // If group has no tags, nothing to do
      if (!group.tags || group.tags.length === 0) {
        return [];
      }
      
      // Remove the specified tags
      const originalLength = group.tags.length;
      group.tags = group.tags.filter(tagId => !tagIdsArray.includes(tagId));
      
      // Only save if tags actually changed
      if (group.tags.length !== originalLength) {
        await this.saveTabGroup(group);
      }
      
      return group.tags;
    } catch (error) {
      console.error('Error removing tags from group:', error);
      throw new Error(`Failed to remove tags: ${error.message}`);
    }
  }
  
  /**
   * Get all tab groups with specific tags
   * @param {string|string[]} tagIds - Tag ID or array of tag IDs to filter by
   * @returns {Promise<Array>} - Array of tab groups with the specified tags
   */
  async getGroupsByTags(tagIds) {
    const tagIdsArray = Array.isArray(tagIds) ? tagIds : [tagIds];
    
    // Get all groups
    const allGroups = await this.getAllTabGroups();
    
    // Filter groups that have all the specified tags
    return allGroups.filter(group => {
      if (!group.tags) return false;
      
      // Check if all specified tags are present in the group
      return tagIdsArray.every(tagId => group.tags.includes(tagId));
    });
  }
}

export default StorageService;
