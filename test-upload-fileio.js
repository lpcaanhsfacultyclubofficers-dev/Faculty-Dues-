import fs from 'fs';

async function uploadToFileIo(filename) {
  const fileBuffer = fs.readFileSync(filename);
  const formData = new FormData();
  formData.append('file', new Blob([fileBuffer]), path.basename(filename));

  const res = await fetch('https://file.io', {
    method: 'POST',
    body: formData
  });

  const json = await res.json();
  return json.link;
}

import path from 'path';

async function main() {
  try {
    const url192 = await uploadToFileIo('public/icon-192-v2.png');
    console.log('URL 192:', url192);
  } catch (err) {
    console.error(err);
  }
}

main();
