# 🔒 TabLocker: Project Roadmap & Tasks

> *Secure your tabs. Organize your workflow. Take control of your browser experience.*

![Status](https://img.shields.io/badge/Status-In%20Progress-brightgreen)
![Version](https://img.shields.io/badge/Version-0.9.0-blue)
![Last Updated](https://img.shields.io/badge/Last%20Updated-March%2012%2C%202025-orange)

## 📊 Project Status

| Category | Progress | Description |
|----------|----------|-------------|
| Core Features | ⬛⬛⬛⬛⬛⬛⬛⬛⬛⬜ 90% | Basic functionality complete, polishing remaining |
| UI/UX | ⬛⬛⬛⬛⬛⬛⬛⬜⬜⬜ 75% | Main interface implemented, enhancements ongoing |
| Security | ⬛⬛⬛⬛⬛⬛⬛⬛⬜⬜ 85% | Encryption in place, audit pending |
| Testing | ⬛⬛⬛⬜⬜⬜⬜⬜⬜⬜ 30% | Manual testing done, automated tests needed |
| Documentation | ⬛⬛⬛⬛⬛⬛⬜⬜⬜⬜ 60% | Core docs in place, needs expansion |

---

## ✅ Implementation Tasks

### Core Features
- [x] Tab saving functionality
- [x] Local storage with IndexedDB
- [x] AES-256-GCM encryption implementation
- [x] Data compression with LZString
- [x] Basic tab restoration
- [x] Tab search
- [x] Export/import functionality
  - [x] OneTab format compatibility
  - [x] Single URL imports
  - [x] Tab group imports (separated by empty lines)
  - [x] File import button
  - [x] Copy-to-clipboard export option
- [x] Modern UI with Preact components
- [x] Toast notifications for user interactions

### 🚧 In Progress
- [ ] Create proper icons for the extension
- [ ] Add option to sort tabs by domain
- [ ] Implement tab deduplication
- [ ] Add dark mode support

### 📝 Planned Features
- [ ] Implement automated tests
- [ ] Add keyboard shortcuts
- [ ] Browser-specific adaptations

### 🔮 Future Enhancements
- [ ] Layer post-quantum encryption (research CRYSTALS-Kyber implementation)
- [ ] Add support for tab groups in UI
- [ ] Add advanced search with regular expressions
- [ ] Implement tagging system for tabs

---

## 🛠️ Technical Considerations

### Technical Debt
- 🔍 Review encryption implementation for audit
- ⚡ Optimize IndexedDB operations for large collections
- 🐛 Improve error handling throughout the application
- ✓ Add robust validation for import/export functions (Partly addressed in March 2025)

### Performance Optimizations
- Lazy loading of tab data for faster UI rendering
- Consider using web workers for encryption operations
- Implement virtualized lists for large tab collections
- Add option to automatically archive older tabs

---

## 🚀 Release Process

### Release Pipeline
1. ✓ Complete core functionality
2. 🚧 Add proper testing and fix bugs
3. 🚧 Create proper icons and UI polish
4. Submit to browser extension stores:
   - 🛒 Chrome Web Store
   - 🦊 Firefox Add-ons
   - 🌐 Microsoft Edge Add-ons
   - 🔴 Opera Add-ons

---

## 💡 Ideas & Inspiration

### Productivity Features
- **Workspaces**: Create dedicated tab collections for different projects. Whitelisted URLs will be automatically place in their respective workspaces

### UX Enhancements
- **Smart Search**: Use locally running AI (Ollama) to categorize, auto label, and find tabs based on content
- **Tab Thumbnails**: Generate and store thumbnails for visual browsing (encrypted?)

---

## 🤝 Community & Contributions

### Privacy Commitment
- **No analytics or tracking** in the extension
- All data stored locally by default
- Encryption as a first-class feature

---

*"TabLocker: Keep your tabs secure, organized, and at your fingertips."*
