import fs from 'fs';

async function uploadToEnvs(filename) {
  const fileBuffer = fs.readFileSync(filename);
  const blob = new Blob([fileBuffer], { type: 'image/png' });
  const formData = new FormData();
  formData.append('file', blob, 'icon.png');

  const res = await fetch('https://envs.sh', {
    method: 'POST',
    body: formData
  });

  const url = await res.text();
  return url.trim();
}

async function main() {
  try {
    const url192 = await uploadToEnvs('public/icon-192-v2.png');
    const url512 = await uploadToEnvs('public/icon-512-v2.png');
    console.log('URL 192:', url192);
    console.log('URL 512:', url512);

    const manifestPath = 'public/manifest.json';
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
  } catch (err) {
    console.error(err);
  }
}

main();
