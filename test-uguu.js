import fs from 'fs';

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

import path from 'path';

async function main() {
  try {
    const url = await uploadToUguu('public/manifest.json');
    console.log('Manifest URL:', url);
  } catch (err) {
    console.error(err);
  }
}

main();
