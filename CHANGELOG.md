# TabLocker Changelog

## Version 1.1.0 - UI Enhancements

### New Features
- **Improved UI Design**: Cleaner, more intuitive interface similar to OneTab
- **Starred Sessions**: Ability to star/lock important tab groups
- **Drag and Drop**: Reordering of tabs within and between groups
- **Memory Savings Indicator**: Shows approximate memory saved by using TabLocker
- **Enhanced Export Options**: 
  - Export as encrypted file
  - Copy URLs to clipboard
- **Visual Improvements**:
  - Better session organization
  - Improved favicon display
  - More intuitive buttons and controls
  - Custom scrollbars for better usability

### Technical Improvements
- Added drag and drop functionality with the new `dragdrop.js` module
- Implemented persistent storage for starred sessions
- Added background script support for updating reordered tabs
- Improved UI responsiveness and visual feedback
- Enhanced error handling for all operations

## [1.1.0] - 2025-03-02

### Added
- Full dashboard page for better tab management
- Dashboard button in popup to open the full dashboard
- Improved drag and drop functionality for reordering tabs
- Visual indicators for draggable elements
- Memory savings display showing approximate RAM saved

### Changed
- Updated UI to be more intuitive and responsive
- Tab lists now expanded by default for better usability
- Improved error handling and user feedback

## Version 1.0.0 - Initial Release

### Features
- **Tab Management**: Save all open tabs, restore individual tabs or entire sessions
- **Security**: AES-256-GCM encryption via the Web Crypto API
- **Privacy**: Local storage only, no cloud services
- **Compression**: LZString compression for efficient storage
- **Export/Import**: Basic export and import functionality
- **Search**: Simple search for saved tabs by title or URL
