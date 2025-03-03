import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

// Mock the chrome API
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn()
    },
    onInstalled: {
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
    create: jest.fn(),
    remove: jest.fn()
  }
};

// Mock window.crypto for tests
if (!global.window) {
  global.window = {};
}

if (!global.window.crypto) {
  global.window.crypto = {
    subtle: {
      generateKey: jest.fn(),
      exportKey: jest.fn(),
      importKey: jest.fn(),
      encrypt: jest.fn(),
      decrypt: jest.fn()
    },
    getRandomValues: jest.fn()
  };
}

// Mock TextEncoder/TextDecoder
if (!global.TextEncoder) {
  global.TextEncoder = class TextEncoder {
    encode(text) {
      return new Uint8Array([...text].map(char => char.charCodeAt(0)));
    }
  };
}

if (!global.TextDecoder) {
  global.TextDecoder = class TextDecoder {
    decode(buffer) {
      return String.fromCharCode(...new Uint8Array(buffer));
    }
  };
}

// Add custom matchers
expect.extend({
  toBeInTheDocument(received) {
    const pass = Boolean(received);
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be in the document`,
      pass
    };
  }
});
