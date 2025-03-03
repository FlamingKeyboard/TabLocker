/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';

// Simple test to verify Jest is working
describe('Popup Tests', () => {
  beforeEach(() => {
    // Mock chrome API
    chrome.runtime.sendMessage = jest.fn().mockResolvedValue({
      success: true,
      tabs: [
        {
          id: '123',
          date: '2025-03-02T12:00:00Z',
          tabs: [{ id: 1, url: 'https://example.com', title: 'Example' }]
        }
      ]
    });
    
    chrome.tabs.query = jest.fn().mockResolvedValue([
      { id: 1, url: 'https://example.com', title: 'Example' }
    ]);
  });
  
  it('should mock chrome.runtime.sendMessage', async () => {
    const response = await chrome.runtime.sendMessage({ action: 'getTabs' });
    expect(response.success).toBe(true);
    expect(response.tabs).toHaveLength(1);
  });
  
  it('should mock chrome.tabs.query', async () => {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    expect(tabs).toHaveLength(1);
    expect(tabs[0].url).toBe('https://example.com');
  });
  
  it('should pass a simple test', () => {
    expect(true).toBe(true);
  });
});
