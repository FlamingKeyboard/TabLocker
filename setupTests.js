// Mock Chrome API
global.chrome = {
  runtime: {
    getURL: jest.fn(path => `chrome-extension://mock-extension-id/${path}`),
    onInstalled: {
      addListener: jest.fn()
    },
    onMessage: {
      addListener: jest.fn()
    }
  },
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
  contextMenus: {
    create: jest.fn(),
    onClicked: {
      addListener: jest.fn()
    }
  },
  commands: {
    onCommand: {
      addListener: jest.fn()
    }
  }
};

// Mock crypto API
const mockSubtle = {
  generateKey: jest.fn(),
  exportKey: jest.fn(),
  importKey: jest.fn(),
  encrypt: jest.fn(),
  decrypt: jest.fn()
};

// Create a mock for crypto that works in both window and global contexts
const mockCrypto = {
  subtle: mockSubtle,
  getRandomValues: jest.fn(arr => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  })
};

// Set up crypto in the global scope
global.crypto = mockCrypto;

// Also set up TextEncoder and TextDecoder if they don't exist
if (typeof TextEncoder === 'undefined') {
  global.TextEncoder = class TextEncoder {
    encode(str) {
      const arr = new Uint8Array(str.length);
      for (let i = 0; i < str.length; i++) {
        arr[i] = str.charCodeAt(i);
      }
      return arr;
    }
  };
}

if (typeof TextDecoder === 'undefined') {
  global.TextDecoder = class TextDecoder {
    decode(arr) {
      return String.fromCharCode.apply(null, new Uint8Array(arr));
    }
  };
}
