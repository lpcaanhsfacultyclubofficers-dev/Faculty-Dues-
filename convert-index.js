import fs from 'fs';
import path from 'path';

const publicDir = path.join(process.cwd(), 'public');
const rootDir = process.cwd();

// Read files
const icon192 = fs.readFileSync(path.join(publicDir, 'icon-192-v2.png'));
const icon512 = fs.readFileSync(path.join(publicDir, 'icon-512-v2.png'));
const iconApple = fs.readFileSync(path.join(publicDir, 'apple-touch-icon.png'));
const iconSvg = fs.readFileSync(path.join(publicDir, 'icon.svg'));

// Convert to base64
const b64192 = `data:image/png;base64,${icon192.toString('base64')}`;
const b64512 = `data:image/png;base64,${icon512.toString('base64')}`;
const b64Apple = `data:image/png;base64,${iconApple.toString('base64')}`;
const b64Svg = `data:image/svg+xml;base64,${iconSvg.toString('base64')}`;

// Read index.html
const indexPath = path.join(rootDir, 'index.html');
let indexHtml = fs.readFileSync(indexPath, 'utf8');

// Replace URLs
indexHtml = indexHtml.replace(/href="\/icon\.svg"/g, `href="${b64Svg}"`);
indexHtml = indexHtml.replace(/href="\/icon-192-v2\.png"/g, `href="${b64192}"`);
indexHtml = indexHtml.replace(/href="\/icon-512-v2\.png"/g, `href="${b64512}"`);
indexHtml = indexHtml.replace(/href="\/apple-touch-icon\.png"/g, `href="${b64Apple}"`);

// Write back
fs.writeFileSync(indexPath, indexHtml);

console.log("Successfully converted index.html icons to Base64!");
