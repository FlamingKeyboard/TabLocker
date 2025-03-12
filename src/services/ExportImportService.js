/**
 * Export/Import Service
 * 
 * Handles exporting and importing tab collections in various formats,
 * including OneTab compatibility and encrypted formats.
 */

import CompressionService from './CompressionService';
import EncryptionService from './EncryptionService';

class ExportImportService {
  constructor(password = null) {
    this.compressionService = new CompressionService();
    this.encryptionService = new EncryptionService(password);
    
    // Default password if none provided
    if (!password) {
      // Try to get the default password from storage
      this.initializeDefaultPassword();
    }
  }

  /**
   * Initialize with default password from storage if available
   */
  async initializeDefaultPassword() {
    try {
      const passwordFromStorage = await chrome.storage.local.get('password');
      if (passwordFromStorage.password) {
        this.setPassword(passwordFromStorage.password);
      }
    } catch (error) {
      console.error('Error initializing default password:', error);
    }
  }

  /**
   * Set password for encryption/decryption operations
   * @param {string} password - Password to use
   */
  setPassword(password) {
    this.encryptionService.setPassword(password);
  }

  /**
   * Export tabs in OneTab compatible format
   * @param {Array} tabs - Array of tab objects with url and title
   * @returns {string} - Text in OneTab format
   */
  exportAsOneTabFormat(tabs) {
    if (!tabs || !tabs.length) {
      return '';
    }

    // OneTab format is simply "URL | Title" for each tab, one per line
    return tabs.map(tab => `${tab.url} | ${tab.title || ''}`).join('\n');
  }

  /**
   * Import tabs from OneTab format
   * @param {string} text - Text in OneTab format
   * @returns {Array} - Array of tab objects
   */
  importFromOneTabFormat(text) {
    if (!text) {
      return [];
    }

    // Split by lines and parse each line
    const lines = text.split('\n').filter(line => line.trim() !== '');
    
    return lines.map(line => {
      // OneTab format is "URL | Title"
      const parts = line.split('|');
      const url = parts[0].trim();
      const title = parts.length > 1 ? parts.slice(1).join('|').trim() : '';
      
      return { url, title };
    });
  }

  /**
   * Export tabs in encrypted format
   * @param {Object} tabGroup - Tab group to export
   * @param {string} customPassword - Optional custom password for this export
   * @returns {Promise<string>} - Encrypted and compressed export string
   */
  async exportEncrypted(tabGroup, customPassword = null) {
    try {
      // Ensure we have a password for encryption
      if (!customPassword && !this.encryptionService.password) {
        const passwordFromStorage = await chrome.storage.local.get('password');
        if (passwordFromStorage.password) {
          this.setPassword(passwordFromStorage.password);
        } else {
          throw new Error('No password set for encryption');
        }
      }
      
      // First compress the data - ensure we save a clone to avoid modifying the original
      const clonedData = JSON.parse(JSON.stringify(tabGroup));
      const compressed = this.compressionService.compressToBase64(clonedData);
      
      // Then encrypt it
      const encrypted = await this.encryptionService.encrypt(compressed, customPassword);
      
      // Add a header to identify this as a TabLocker encrypted export
      return `TABLOCKER:${encrypted}`;
    } catch (error) {
      console.error('Export encryption error:', error);
      throw new Error('Export error: ' + error.message);
    }
  }

  /**
   * Import tabs from encrypted format
   * @param {string} encryptedText - Encrypted export string
   * @param {string} customPassword - Optional custom password for this import
   * @returns {Promise<Object>} - Decrypted tab group
   */
  async importEncrypted(encryptedText, customPassword = null) {
    try {
      // Validate input
      if (!encryptedText || typeof encryptedText !== 'string') {
        throw new Error('No data to import or invalid format');
      }

      // Check if this is a valid TabLocker export
      if (!encryptedText.startsWith('TABLOCKER:')) {
        throw new Error('Invalid TabLocker export format');
      }
      
      // Ensure we have a password for decryption
      if (!customPassword && !this.encryptionService.password) {
        const passwordFromStorage = await chrome.storage.local.get('password');
        if (passwordFromStorage.password) {
          this.setPassword(passwordFromStorage.password);
        } else {
          throw new Error('No password set for decryption');
        }
      }
      
      // Remove the header
      const encrypted = encryptedText.substring('TABLOCKER:'.length);
      
      // Decrypt the data
      let decrypted;
      try {
        decrypted = await this.encryptionService.decrypt(encrypted, customPassword);
      } catch (error) {
        console.error('Decryption failed during import:', error);
        throw new Error(`Unable to decrypt tab group: ${error.message}`);
      }
      
      if (!decrypted) {
        throw new Error('Decryption returned empty data');
      }
      
      // Decompress the data
      let decompressed;
      try {
        decompressed = this.compressionService.decompressFromBase64(decrypted);
      } catch (error) {
        console.error('Decompression failed during import:', error);
        throw new Error(`Failed to decompress import data: ${error.message}`);
      }
      
      if (!decompressed) {
        throw new Error('Failed to decompress import data');
      }
      
      // Validate the decompressed data structure
      if (typeof decompressed === 'object' && !Array.isArray(decompressed) && 
          (!decompressed.tabs || !Array.isArray(decompressed.tabs))) {
        console.warn('Import data missing tabs array:', decompressed);
      }
      
      return decompressed;
    } catch (error) {
      console.error('Import decryption error:', error);
      throw new Error(`Error processing import: ${error.message}`);
    }
  }

  /**
   * Check if text is in OneTab format
   * @param {string} text - Text to check
   * @returns {boolean} - Whether the text is in OneTab format
   */
  isOneTabFormat(text) {
    if (!text) {
      return false;
    }
    
    // Check a few lines to see if they match OneTab format
    const lines = text.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length === 0) {
      return false;
    }
    
    // OneTab format should have at least some lines with "http" and a pipe symbol
    const validLines = lines.filter(line => 
      (line.includes('http://') || line.includes('https://')) && 
      line.includes('|')
    );
    
    // If at least 80% of non-empty lines are valid, consider it OneTab format
    return validLines.length / lines.length >= 0.8;
  }

  /**
   * Check if text is in TabLocker encrypted format
   * @param {string} text - Text to check
   * @returns {boolean} - Whether the text is in TabLocker encrypted format
   */
  isTabLockerFormat(text) {
    return text && text.startsWith('TABLOCKER:');
  }

  /**
   * Auto-detect and import from any supported format
   * @param {string} text - Text to import
   * @param {string} password - Password for encrypted imports
   * @returns {Promise<Object>} - Imported tab group
   */
  async autoImport(text, password = null) {
    if (!text) {
      throw new Error('No import data provided');
    }
    
    if (this.isTabLockerFormat(text)) {
      return {
        type: 'tablocker',
        data: await this.importEncrypted(text, password)
      };
    } else if (this.isOneTabFormat(text)) {
      return {
        type: 'onetab',
        data: {
          tabs: this.importFromOneTabFormat(text),
          name: `Imported from OneTab ${new Date().toLocaleString()}`
        }
      };
    } else {
      throw new Error('Unsupported import format');
    }
  }

  /**
   * Download data as a file
   * @param {string} data - Data to download
   * @param {string} filename - Filename to use
   * @param {string} type - MIME type of the file
   */
  downloadAsFile(data, filename, type = 'text/plain') {
    // This only works in browser contexts, not in service workers
    try {
      const blob = new Blob([data], { type });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      
      // Append to body, click, and remove
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Release the blob URL
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error('Error creating download:', error);
      throw new Error('Cannot download file in this context');
    }
  }
}

export default ExportImportService;
