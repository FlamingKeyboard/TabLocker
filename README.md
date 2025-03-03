# TabLocker

![icon](https://raw.githubusercontent.com/FlamingKeyboard/TabLocker/refs/heads/main/icons/default-favicon.svg)

A privacy-focused browser extension for securely saving and restoring browser tabs with local encryption.

## Features

- **Tab Management**: Save all open tabs, restore individual tabs or entire sessions
- **Security**: All data is encrypted locally using AES-256-GCM via the Web Crypto API
- **Privacy**: No cloud storage or external services - all data stays on your device
- **Compression**: Uses LZString to compress data before encryption for efficient storage
- **Export/Import**: Export and import your saved tabs as encrypted files
- **Search**: Find saved tabs by title or URL

## Technical Details

### Security

TabLocker uses the Web Crypto API to implement AES-256-GCM encryption for all saved tab data. The encryption key is generated when the extension is first installed and stored securely in local storage.

### Data Storage

All data is stored locally using the browser's storage API. No data is sent to any external servers.

### Compression

TabLocker uses LZString to compress tab data before encryption, reducing storage requirements and enabling more efficient export/import.

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
3. Use "Restore Tabs" to view and restore previously saved tabs
4. Search through your saved tabs using the search box

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

### Project Structure

- `src/`: Source code
  - `background.js`: Background service worker for handling tab operations and encryption
  - `popup.js`: Preact-based UI for the extension popup
  - `styles.css`: Styling for the UI
- `icons/`: Extension icons
- `manifest.json`: Extension manifest file
- `webpack.config.js`: Webpack configuration

## Future Enhancements

- QR code export/import for small datasets
- PIN-based unlocking for additional security
- Higher compression ratio using LZMA for QR code exports
- Tab grouping and organization features
- Keyboard shortcuts for common operations
- Dark mode support

## License

This project is licensed under the GPL-3.0 License.
