import fs from 'fs';
import path from 'path';

const publicDir = path.join(process.cwd(), 'public');
const rootDir = process.cwd();

// 1. Read the high-quality local images
const icon192 = fs.readFileSync(path.join(publicDir, 'icon-192-v2.png'));
const icon512 = fs.readFileSync(path.join(publicDir, 'icon-512-v2.png'));
const iconSvg = fs.readFileSync(path.join(publicDir, 'icon.svg'));

// 2. Convert icons to Base64 strings
const b64192 = `data:image/png;base64,${icon192.toString('base64')}`;
const b64512 = `data:image/png;base64,${icon512.toString('base64')}`;
const b64Svg = `data:image/svg+xml;base64,${iconSvg.toString('base64')}`;

// 3. Create a clean, self-contained Manifest Object
const manifest = {
  "name": "Faculty Club",
  "short_name": "Faculty Dues",
  "description": "Faculty Club Dues Management System",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#001233",
  "theme_color": "#0038A8",
  "icons": [
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
  ]
};

// 4. Convert the entire Manifest to a Data URI
const manifestJson = JSON.stringify(manifest);
const manifestDataUri = `data:application/manifest+json;base64,${Buffer.from(manifestJson).toString('base64')}`;

// 5. Inject the Data URI Manifest into index.html
const indexPath = path.join(rootDir, 'index.html');
let indexHtml = fs.readFileSync(indexPath, 'utf8');

// Replace the manifest link with the self-contained Data URI version
indexHtml = indexHtml.replace(/<link rel="manifest" href="[^"]+" \/>/, `<link rel="manifest" href="${manifestDataUri}" />`);

fs.writeFileSync(indexPath, indexHtml);

// Also sync the physical manifest.json just in case some tools strictly prefer it
fs.writeFileSync(path.join(publicDir, 'manifest.json'), manifestJson);

console.log("Successfully implemented Zero-Fetch Manifest architecture.");
