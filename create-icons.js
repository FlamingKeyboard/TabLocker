const fs = require('fs');
const path = require('path');

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir);
}

// Simple function to create a placeholder SVG icon
function createSvgIcon(size, filename) {
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#4285f4"/>
  <circle cx="${size/2}" cy="${size/2}" r="${size/3}" fill="white"/>
  <rect x="${size/2 - size/8}" y="${size/2 - size/3}" width="${size/4}" height="${size*2/3}" fill="#4285f4"/>
</svg>`;

  fs.writeFileSync(path.join(iconsDir, filename), svg);
  console.log(`Created ${filename}`);
}

// Create icons in different sizes
createSvgIcon(16, 'icon16.svg');
createSvgIcon(48, 'icon48.svg');
createSvgIcon(128, 'icon128.svg');

// Create a default favicon
createSvgIcon(16, 'default-favicon.svg');

console.log('Icons created successfully');
