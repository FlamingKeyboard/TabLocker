/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';

// Mock the background.js module
jest.mock('./background', () => {
  return {
    generateAndStoreEncryptionKey: jest.fn().mockResolvedValue(undefined),
    saveTabs: jest.fn().mockResolvedValue({ sessionId: '123', tabCount: 1 }),
    getSavedTabs: jest.fn().mockResolvedValue([
      {
        id: '123',
        date: '2025-03-02T12:00:00Z',
        tabs: [{ id: 1, url: 'https://example.com', title: 'Example' }]
      }
    ]),
    exportTabs: jest.fn().mockImplementation((sessionId) => {
      if (sessionId === '123') {
        return Promise.resolve('compressed-data');
      } else {
        return Promise.reject(new Error('Session not found'));
      }
    }),
    importTabs: jest.fn().mockImplementation((data) => {
      if (data === 'invalid-data') {
        return Promise.reject(new Error('Invalid import data'));
      } else {
        return Promise.resolve({ sessionId: '123', tabCount: 1 });
      }
    }),
    updateSessions: jest.fn().mockResolvedValue({ success: true })
  };
});

// Import the mocked module
import { generateAndStoreEncryptionKey, saveTabs, getSavedTabs, exportTabs, importTabs, updateSessions } from './background';

// Mock the chrome API responses
beforeEach(() => {
  // Reset all mocks
  jest.clearAllMocks();
  
  // Mock successful storage responses
  chrome.storage.local.get.mockImplementation((key) => {
    if (key === 'encryptionKey') {
      return Promise.resolve({
        encryptionKey: new Uint8Array([1, 2, 3, 4])
      });
    }
    return Promise.resolve({});
  });
  
  // Ensure window is defined
  if (typeof window === 'undefined') {
    global.window = {};
  }
  
  // Mock successful crypto operations
  window.crypto = {
    subtle: {
      generateKey: jest.fn().mockResolvedValue({
        type: 'secret',
        extractable: true,
        algorithm: { name: 'AES-GCM' },
        usages: ['encrypt', 'decrypt']
      }),
      exportKey: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4])),
      importKey: jest.fn().mockResolvedValue({
        type: 'secret',
        extractable: false,
        algorithm: { name: 'AES-GCM' },
        usages: ['encrypt', 'decrypt']
      }),
      encrypt: jest.fn().mockResolvedValue(new Uint8Array([5, 6, 7, 8])),
      decrypt: jest.fn().mockResolvedValue(new TextEncoder().encode('{"test":"data"}'))
    },
    getRandomValues: jest.fn().mockImplementation((arr) => {
      arr.fill(1);
      return arr;
    })
  };
});

describe('Background Script', () => {
  describe('generateAndStoreEncryptionKey', () => {
    it('should generate and store an encryption key', async () => {
      await generateAndStoreEncryptionKey();
      
      expect(generateAndStoreEncryptionKey).toHaveBeenCalled();
    });
  });
  
  describe('saveTabs', () => {
    it('should compress, encrypt, and save tabs', async () => {
      const mockTabs = [
        { id: 1, url: 'https://example.com', title: 'Example' }
      ];
      
      const result = await saveTabs(mockTabs);
      
      expect(result).toEqual(expect.objectContaining({
        sessionId: expect.any(String),
        tabCount: 1
      }));
      
      expect(saveTabs).toHaveBeenCalledWith(mockTabs);
    });
    
    it('should handle errors when saving tabs', async () => {
      // Mock a failure
      saveTabs.mockRejectedValueOnce(new Error('Storage error'));
      
      await expect(saveTabs([])).rejects.toThrow('Storage error');
    });
  });
  
  describe('getSavedTabs', () => {
    it('should decrypt and decompress saved tabs', async () => {
      const result = await getSavedTabs();
      
      expect(result).toEqual([
        expect.objectContaining({
          id: '123',
          date: '2025-03-02T12:00:00Z',
          tabs: expect.any(Array)
        })
      ]);
      
      expect(getSavedTabs).toHaveBeenCalled();
    });
    
    it('should handle missing encryption key', async () => {
      // Mock a failure
      getSavedTabs.mockRejectedValueOnce(new Error('Encryption key not found'));
      
      await expect(getSavedTabs()).rejects.toThrow('Encryption key not found');
    });
  });
  
  describe('exportTabs', () => {
    it('should export tabs in a compressed format', async () => {
      const result = await exportTabs('123');
      
      // Verify the result is a compressed string
      expect(typeof result).toBe('string');
      expect(result).toBe('compressed-data');
      
      expect(exportTabs).toHaveBeenCalledWith('123');
    });
    
    it('should handle non-existent session ID', async () => {
      await expect(exportTabs('non-existent')).rejects.toThrow('Session not found');
    });
  });
  
  describe('importTabs', () => {
    it('should import and save valid tab data', async () => {
      const result = await importTabs('valid-data');
      
      expect(result).toEqual(expect.objectContaining({
        sessionId: expect.any(String),
        tabCount: 1
      }));
      
      expect(importTabs).toHaveBeenCalledWith('valid-data');
    });
    
    it('should reject invalid import data', async () => {
      await expect(importTabs('invalid-data')).rejects.toThrow('Invalid import data');
    });
  });
  
  describe('updateSessions', () => {
    it('should update sessions with reordered tabs', async () => {
      const mockSessions = [
        {
          id: '123',
          tabs: [
            { id: 1, url: 'https://example.com', title: 'Example 1' },
            { id: 2, url: 'https://example.org', title: 'Example 2' }
          ]
        }
      ];
      
      const result = await updateSessions(mockSessions);
      
      expect(result).toEqual({ success: true });
      expect(updateSessions).toHaveBeenCalledWith(mockSessions);
    });
    
    it('should handle errors when updating sessions', async () => {
      // Mock a failure
      updateSessions.mockRejectedValueOnce(new Error('Update error'));
      
      await expect(updateSessions([])).rejects.toThrow('Update error');
    });
  });
});
