import https from 'https';

const url = 'https://ais-pre-yybqppp7grceyg3uc6yrnj-666096907420.asia-east1.run.app/icon-192-v2.png';

https.get(url, (res) => {
  console.log('Status code:', res.statusCode);
  console.log('Headers:', res.headers);
  
  let data = '';
  res.on('data', chunk => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Body snippet:', data.substring(0, 200));
    process.exit(0);
  });
}).on('error', (e) => {
  console.error('Error:', e);
});
