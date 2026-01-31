const fs = require('fs');
const path = require('path');

// Simple SVG to use as icon
function createIconSVG(size) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#grad)" rx="${size * 0.15}"/>
  <path d="M ${size * 0.3} ${size * 0.35} L ${size * 0.45} ${size * 0.5} L ${size * 0.7} ${size * 0.3}"
        stroke="white" stroke-width="${size * 0.1}" fill="none"
        stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="${size * 0.5}" cy="${size * 0.5}" r="${size * 0.35}"
          stroke="white" stroke-width="${size * 0.08}" fill="none"/>
</svg>`;
}

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir);
}

// Generate SVG icons
const sizes = [16, 48, 128];
sizes.forEach(size => {
    const svg = createIconSVG(size);
    const filename = path.join(iconsDir, `icon${size}.svg`);
    fs.writeFileSync(filename, svg);
    console.log(`✓ Created ${filename}`);
});

console.log('\n✓ Icons generated successfully!');
console.log('\nNote: These are SVG files. For better compatibility, convert to PNG.');
console.log('You can use: https://cloudconvert.com/svg-to-png or any SVG converter.\n');
