import fs from 'fs';
import path from 'path';

const publicDir = path.join(process.cwd(), 'public');

// Read files
const icon192 = fs.readFileSync(path.join(publicDir, 'icon-192-v2.png'));
const icon512 = fs.readFileSync(path.join(publicDir, 'icon-512-v2.png'));
const iconSvg = fs.readFileSync(path.join(publicDir, 'icon.svg'));

// Convert to base64
const b64192 = `data:image/png;base64,${icon192.toString('base64')}`;
const b64512 = `data:image/png;base64,${icon512.toString('base64')}`;
const b64Svg = `data:image/svg+xml;base64,${iconSvg.toString('base64')}`;

// Read manifest
const manifestPath = path.join(publicDir, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Update icons
manifest.icons = [
  {
    "src": b64192,
    "type": "image/png",
    "sizes": "192x192",
    "purpose": "any maskable"
  },
  {
    "src": b64512,
    "type": "image/png",
    "sizes": "512x512",
    "purpose": "any maskable"
  },
  {
    "src": b64Svg,
    "type": "image/svg+xml",
    "sizes": "any",
    "purpose": "any"
  }
];

// Write back
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log("Successfully converted manifest icons to Base64 Data URIs!");
