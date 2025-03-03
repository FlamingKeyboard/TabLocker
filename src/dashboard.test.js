/**
 * Dashboard functionality tests
 */

import { init } from './tablocker';
import { decryptData, encryptData } from './crypto';
import { initDragAndDrop, reorderTabs } from './dragdrop';

// Mock the dragdrop module
jest.mock('./dragdrop', () => ({
  initDragAndDrop: jest.fn(() => ({
    // Return a mock drag drop manager
    update: jest.fn()
  })),
  reorderTabs: jest.fn()
}));

// Mock the chrome API
global.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  },
  tabs: {
    query: jest.fn(),
    create: jest.fn()
  },
  windows: {
    create: jest.fn()
  },
  runtime: {
    getURL: jest.fn()
  }
};

// Mock the crypto module
jest.mock('./crypto', () => ({
  decryptData: jest.fn(),
  encryptData: jest.fn()
}));

// Create a proper mock for document elements
const createElementMock = () => ({
  className: '',
  style: {},
  appendChild: jest.fn(),
  addEventListener: jest.fn(),
  setAttribute: jest.fn(),
  classList: {
    add: jest.fn(),
    remove: jest.fn(),
    contains: jest.fn()
  },
  innerHTML: '',
  querySelectorAll: jest.fn().mockReturnValue([]),
  querySelector: jest.fn().mockReturnValue(null)
});

// Mock DOM elements
document.getElementById = jest.fn();
document.createElement = jest.fn(() => createElementMock());

// Create a proper HTMLElement mock for document.body
const bodyMock = createElementMock();
Object.defineProperty(document, 'body', {
  value: bodyMock,
  writable: true
});

describe('Dashboard Functionality', () => {
  let mockDashboardContent;
  let mockSaveButton;
  let mockCreateButton;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set up DOM element mocks
    mockDashboardContent = {
      innerHTML: '',
      appendChild: jest.fn(),
      querySelectorAll: jest.fn().mockReturnValue([]),
      querySelector: jest.fn().mockReturnValue(null)
    };
    
    mockSaveButton = {
      addEventListener: jest.fn()
    };
    
    mockCreateButton = {
      addEventListener: jest.fn()
    };
    
    // Set up getElementById mock
    document.getElementById.mockImplementation((id) => {
      if (id === 'dashboardContent') return mockDashboardContent;
      if (id === 'saveCurrentTabs') return mockSaveButton;
      if (id === 'createNewSession') return mockCreateButton;
      return null;
    });
    
    // Mock chrome storage
    chrome.storage.local.get.mockResolvedValue({
      sessions: [],
      encryptionKeyExists: true
    });
    
    // Mock chrome storage set
    chrome.storage.local.set.mockResolvedValue();
    
    // Mock decryptData and encryptData
    decryptData.mockImplementation(data => Promise.resolve(data));
    encryptData.mockImplementation(data => Promise.resolve(data));
  });
  
  test('init sets up event listeners', () => {
    // Call the function
    window.init();
    
    // Check that event listeners were added to buttons
    expect(mockSaveButton.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    expect(mockCreateButton.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
  });
  
  test('loadSessions displays empty state when no sessions exist', async () => {
    // Set up chrome storage to return no sessions
    chrome.storage.local.get.mockResolvedValue({
      sessions: [],
      encryptionKeyExists: true
    });
    
    // Call the function
    window.init();
    
    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Check that empty state was displayed
    expect(mockDashboardContent.innerHTML).toContain('You don\'t have any saved sessions yet');
  });
  
  test('loadSessions displays sessions when they exist', async () => {
    // Set up mock sessions
    const mockSessions = [
      {
        id: '123',
        name: 'Test Session',
        tabs: [
          { url: 'https://example.com', title: 'Example', favIconUrl: 'icon.png' }
        ],
        createdAt: new Date().toISOString()
      }
    ];
    
    // Set up chrome storage to return sessions
    chrome.storage.local.get.mockResolvedValue({
      sessions: mockSessions,
      encryptionKeyExists: true
    });
    
    // Mock decryptData to return the sessions
    decryptData.mockResolvedValue(mockSessions);
    
    // Call the function
    window.init();
    
    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Check that sessions were displayed
    expect(mockDashboardContent.innerHTML).toBe('');
    expect(mockDashboardContent.appendChild).toHaveBeenCalled();
  });
  
  test('saveCurrentTabs creates a new session', async () => {
    // Set up mock tabs
    const mockTabs = [
      { url: 'https://example.com', title: 'Example', favIconUrl: 'icon.png' }
    ];
    
    // Set up chrome tabs query to return tabs
    chrome.tabs.query.mockResolvedValue(mockTabs);
    
    // Call the function
    window.init();
    
    // Get the saveCurrentTabs function
    const saveCurrentTabsFunction = mockSaveButton.addEventListener.mock.calls[0][1];
    
    // Call the function
    await saveCurrentTabsFunction();
    
    // Check that chrome storage was called with the new session
    expect(chrome.storage.local.set).toHaveBeenCalled();
    const setCall = chrome.storage.local.set.mock.calls[0][0];
    expect(setCall).toHaveProperty('sessions');
  });
});
