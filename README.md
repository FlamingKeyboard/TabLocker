# TabLocker

A privacy-focused browser extension for securely saving and restoring browser tabs with local encryption.

## Features

- **Tab Management**: Save and restore browser tabs with one click
- **Local Encryption**: AES-256-GCM encryption using Web Crypto API
- **Privacy First**: All data stored locally, no cloud services
- **Data Compression**: Efficient storage using compression
- **Export/Import**: Securely export and import your saved tabs
- **Cross-Browser**: Compatible with Chrome, Firefox, Edge, and Opera

## Security Features

- AES-256-GCM encryption for all saved data
- Secure key management using browser's built-in crypto capabilities
- No data leaves your device - everything is stored locally
- Optional PIN protection for accessing saved tabs

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

### Project Structure

```
tablocker/
├── manifest.json        # Extension manifest
├── popup.html           # Main extension popup
├── popup.js             # Popup script
├── background.js        # Background script for extension
├── styles.css           # Styles for the extension
├── icons/               # Extension icons
└── README.md            # This file
```

### Future Development

- Preact UI implementation
- LZString compression integration
- QR code export/import
- Post-quantum encryption layer
- Desktop app for local syncing

## License

This project is licensed under the GNU General Public License v3.0 - see the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
