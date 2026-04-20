import fs from 'fs';
import path from 'path';

async function uploadToUguu(filename) {
  const fileBuffer = fs.readFileSync(filename);
  const formData = new FormData();
  formData.append('files[]', new Blob([fileBuffer]), path.basename(filename));

  const res = await fetch('https://uguu.se/upload.php', {
    method: 'POST',
    body: formData
  });

  const json = await res.json();
  return json.files[0].url;
}

async function main() {
  try {
    const icon192 = await uploadToUguu('public/icon-192-v2.png');
    const icon512 = await uploadToUguu('public/icon-512-v2.png');
    const appleIcon = await uploadToUguu('public/apple-touch-icon.png');
    
    console.log('Icon 192:', icon192);
    console.log('Icon 512:', icon512);

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
          "src": icon192,
          "type": "image/png",
          "sizes": "192x192",
          "purpose": "any maskable"
        },
        {
          "src": icon512,
          "type": "image/png",
          "sizes": "512x512",
          "purpose": "any maskable"
        }
      ]
    };

    const manifestPath = 'public/manifest-public.json';
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    
    const manifestUrl = await uploadToUguu(manifestPath);
    console.log('Public Manifest URL:', manifestUrl);

    // Update index.html
    const indexPath = 'index.html';
    let indexHtml = fs.readFileSync(indexPath, 'utf8');
    
    // Replace manifest link with public one
    // We target the link tag. Since I used a data URI before, I need to be careful.
    indexHtml = indexHtml.replace(/<link rel="manifest" href="[^"]+" \/>/, `<link rel="manifest" href="${manifestUrl}" />`);
    
    fs.writeFileSync(indexPath, indexHtml);
    console.log('Updated index.html with public manifest.');

  } catch (err) {
    console.error(err);
  }
}

main();
