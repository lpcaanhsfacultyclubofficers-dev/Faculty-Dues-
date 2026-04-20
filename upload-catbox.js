import fs from 'fs';
import FormData from 'form-data';
import https from 'https';
import path from 'path';

async function uploadToCatbox(filePath) {
  const form = new FormData();
  form.append('reqtype', 'fileupload');
  form.append('fileToUpload', fs.createReadStream(filePath));

  return new Promise((resolve, reject) => {
    const request = https.request({
      method: 'POST',
      host: 'catbox.moe',
      path: '/user/api.php',
      headers: form.getHeaders(),
    });

    request.on('response', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });

    request.on('error', reject);
    form.pipe(request);
  });
}

async function main() {
  try {
    const url192 = await uploadToCatbox(path.join(process.cwd(), 'public', 'icon-192-v2.png'));
    const url512 = await uploadToCatbox(path.join(process.cwd(), 'public', 'icon-512-v2.png'));
    
    console.log('URL 192:', url192);
    console.log('URL 512:', url512);

    // Update manifest
    const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    manifest.icons = [
      {
        "src": url192,
        "type": "image/png",
        "sizes": "192x192",
        "purpose": "any maskable"
      },
      {
        "src": url512,
        "type": "image/png",
        "sizes": "512x512",
        "purpose": "any maskable"
      }
    ];
    
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('Manifest updated successfully.');
  } catch (e) {
    console.error(e);
  }
}

main();
