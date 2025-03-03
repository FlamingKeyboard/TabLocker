# TabLocker

![icon](https://raw.githubusercontent.com/FlamingKeyboard/TabLocker/refs/heads/main/icons/default-favicon.svg)

A privacy-focused browser extension for securely saving and restoring browser tabs with local encryption.

## Features

- **Secure Tab Management**: Save and restore your tabs with local encryption
- **Privacy-Focused**: All data is stored locally, nothing is sent to any server
- **Memory Savings**: Free up browser memory by saving tabs you're not using right now
- **Drag and Drop**: Easily reorder tabs within and between sessions
- **Full Dashboard**: Access a dedicated dashboard page for better tab management
- **Export/Import**: Share your saved tabs between devices or create backups
- **Search**: Quickly find tabs across all your saved sessions
- **Star Sessions**: Mark important sessions for quick access

## Technical Details

### Security

TabLocker uses the Web Crypto API to implement AES-256-GCM encryption for all saved tab data. The encryption key is generated when the extension is first installed and stored securely in local storage.

### Data Storage

All data is stored locally using the browser's storage API. No data is sent to any external servers.

### Compression

TabLocker uses LZString to compress tab data before encryption, reducing storage requirements and enabling more efficient export/import.

### UI Framework

The user interface is built using Preact, a lightweight alternative to React, providing a fast and responsive experience.

## Installation

### Development Mode

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/tablocker.git
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Build the extension:
   ```
   npm run build
   ```

4. Load the extension in your browser:
   - **Chrome/Edge/Opera**: Go to `chrome://extensions/`, enable "Developer mode", click "Load unpacked", and select the `dist` folder.
   - **Firefox**: Go to `about:debugging#/runtime/this-firefox`, click "Load Temporary Add-on", and select any file in the `dist` folder.

## Usage

1. Click the TabLocker icon in your browser toolbar
2. Use "Save All Tabs" to save your current tabs
3. View and manage your saved sessions directly in the main view
4. Search through your saved tabs using the search box
5. Star important sessions to keep them at the top of the list
6. Drag and drop tabs to reorder them within or between sessions
7. Export sessions as encrypted files or copy URLs to clipboard
8. Import previously exported sessions

## Development

### Prerequisites

- Node.js and npm

### Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Build the extension: `npm run build`

### Development Commands

- `npm run build`: Build the extension
- `npm run watch`: Watch for changes and rebuild automatically
- `npm test`: Run the Jest test suite

### Project Structure

- `src/`: Source code
  - `background.js`: Background service worker for handling tab operations and encryption
  - `popup.js`: Preact-based UI for the extension popup
  - `dragdrop.js`: Drag and drop functionality for tab reordering
  - `styles.css`: Styling for the UI
- `icons/`: Extension icons
- `manifest.json`: Extension manifest file
- `webpack.config.js`: Webpack configuration
- `__tests__/`: Test files
  - `background.test.js`: Tests for background script functionality
  - `popup.test.js`: Tests for UI interactions

## Future Enhancements

- QR code export/import for small datasets
- PIN-based unlocking for additional security
- Higher compression ratio using LZMA for QR code exports
- Advanced tab grouping and organization features
- Keyboard shortcuts for common operations
- Dark mode support
- Customizable UI themes

## License

This project is licensed under the GPL-3.0 License.
