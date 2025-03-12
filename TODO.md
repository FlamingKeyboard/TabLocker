# TabLocker TODO List

## Research Findings

### OneTab Analysis
- OneTab stores data in local browser storage
- Basic data format is URLs with page titles
- No encryption by default
- Exports data as plain text in a simple format: `URL | Title`
- Allows sharing via a public URL (which we will NOT implement for privacy)

### Browser Extension Requirements
- Chrome, Firefox, Edge, and Opera each have slightly different APIs
- Manifest V3 is required for Chrome Web Store (and Edge)
- Firefox requires an `applications` section in the manifest
- Firefox still supports Manifest V2, but we'll use Manifest V3 for cross-browser support

### Security Considerations
- AES-256-GCM is currently considered secure
- Web Crypto API provides good performance for encryption operations
- Post-quantum algorithms like CRYSTALS-Kyber can be layered on top later
- Key storage is a challenge; will store keys locally with optional PIN protection

## Implementation Tasks

### Core Features
- [x] Tab saving functionality
- [x] Local storage with IndexedDB
- [x] AES-256-GCM encryption implementation
- [x] Data compression with LZString
- [x] Basic tab restoration
- [x] Tab search
- [x] Export/import functionality
- [x] Preact UI components

### To Be Implemented
- [ ] Create proper icons for the extension
- [ ] Implement automated tests
- [ ] Add keyboard shortcuts
- [ ] Browser-specific adaptations
- [ ] Add option to sort tabs by domain
- [ ] Add option to save tabs as markdown
- [ ] Implement tab deduplication
- [ ] Add dark mode support
- [ ] Add language translations
- [ ] Consider implementing a sidebar view (similar to Firefox's sidebar)

### Future Enhancements
- [ ] Layer post-quantum encryption (research CRYSTALS-Kyber implementation)
- [ ] Implement a desktop companion app for local backup
- [ ] Create sync mechanism between different browsers via local network
- [ ] Add support for tab groups in UI (already supported in storage layer)
- [ ] Add advanced search with regular expressions
- [ ] Consider adding tagging system for tabs
- [ ] Implement browser context restoration (window positions, sizes)
- [ ] Add option for bookmark integration

## Technical Debt
- Review encryption implementation for audit
- Consider optimizing IndexedDB operations for large collections
- Improve error handling throughout the application
- Add more robust validation for import/export functions

## Release Process
1. Complete core functionality
2. Add proper testing and fix bugs
3. Create proper icons and UI polish
4. Submit to browser extension stores:
   - Chrome Web Store
   - Firefox Add-ons
   - Microsoft Edge Add-ons
   - Opera Add-ons

## Ideas to Explore
- Implement a "suspend tabs after time" feature
- Consider periodic local backups
- Add a "declutter" feature to group similar tabs
- Research how to handle tab history (forward/back state)
- Explore ways to preview tab content without loading the page
- Consider a feature to schedule tab restoration (for recurring tabs)
- Implement a "reading mode" integration for articles
