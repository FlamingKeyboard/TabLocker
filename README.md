# TabLocker

A secure, privacy-focused browser extension for saving and managing tabs with local encryption and compression.

## Features

- **One-click Tab Saving**: Save all open tabs or just selected ones
- **Tab Restoration**: Restore tabs individually or all at once
- **Local Encryption**: AES-256-GCM encryption via Web Crypto API
- **Data Compression**: Local data compression before encryption
- **Private by Design**: 100% local storage with no cloud connectivity
- **Import/Export**: Export your tabs as encrypted files or OneTab-compatible format
- **Basic Search**: Find your saved tabs by title or URL
- **Cross-Browser Support**: Works on Chrome, Firefox, Edge, and Opera

## Privacy & Security

TabLocker is designed with privacy as a top priority:
- All tab data is stored locally on your device
- AES-256-GCM encryption for all saved data
- Optional PIN protection
- No data sent to any server
- No analytics or tracking
- Open source code for transparency

## Installation

### From Web Stores
*Coming soon*

### Manual Installation (Developer Mode)
1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run build` to build the extension
4. Load the extension:
   - **Chrome/Edge/Opera**: Go to extensions page, enable developer mode, click "Load unpacked", and select the `dist` folder
   - **Firefox**: Go to `about:debugging`, click "This Firefox", click "Load Temporary Add-on", and select any file in the `dist` folder

## Development

### Prerequisites
- Node.js (v14 or higher)
- npm (v7 or higher)

### Setup
```bash
# Clone the repository
git clone https://github.com/your-username/tablocker.git
cd tablocker

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## License

This project is licensed under the GPL License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
