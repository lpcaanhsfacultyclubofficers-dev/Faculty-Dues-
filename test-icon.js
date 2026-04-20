import http from 'http';

http.get('http://localhost:3000/icon-192.png', (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);
  process.exit(0);
}).on('error', (e) => {
  console.error(e);
  process.exit(1);
});
