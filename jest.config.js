module.exports = {
  // The root directory that Jest should scan for tests and modules
  roots: ['<rootDir>/src'],
  
  // A list of paths to directories that Jest should use to search for files in
  moduleDirectories: ['node_modules', 'src'],
  
  // The test environment that will be used for testing
  testEnvironment: 'jsdom',
  
  // A list of paths to modules that run some code to configure or set up the testing environment
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  
  // The glob patterns Jest uses to detect test files
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  
  // An array of regexp pattern strings that are matched against all test paths
  testPathIgnorePatterns: ['/node_modules/'],
  
  // An array of regexp pattern strings that are matched against all source paths
  transformIgnorePatterns: [
    '/node_modules/(?!(preact|@testing-library|lz-string)/)'
  ],
  
  // A map from regular expressions to paths to transformers
  transform: {
    '^.+\\.js$': ['babel-jest', { rootMode: 'upward' }],
    '^.+\\.mjs$': ['babel-jest', { rootMode: 'upward' }]
  },
  
  // A map from regular expressions to module names that allow to stub out resources
  moduleNameMapper: {
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg)$': '<rootDir>/src/__mocks__/fileMock.js'
  }
};
