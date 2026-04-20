import fs from 'fs';

const manifestPath = 'public/manifest.json';
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

manifest.icons = [
  {
    "src": "https://ui-avatars.com/api/?name=FD&background=001848&color=FCD116&size=192&font-size=0.5&bold=true",
    "type": "image/png",
    "sizes": "192x192",
    "purpose": "any maskable"
  },
  {
    "src": "https://ui-avatars.com/api/?name=FD&background=001848&color=FCD116&size=512&font-size=0.5&bold=true",
    "type": "image/png",
    "sizes": "512x512",
    "purpose": "any maskable"
  }
];

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

// Remove old conversions from index.html for cleanliness
let indexHtml = fs.readFileSync('index.html', 'utf8');
indexHtml = indexHtml.replace(/href="data:image\/svg\+xml;base64,[^"]+"/g, 'href="/icon.svg"');
indexHtml = indexHtml.replace(/href="data:image\/png;base64,[^"]+"/g, 'href="/icon-192-v2.png"');
fs.writeFileSync('index.html', indexHtml);

console.log("Manifest rewritten!");
