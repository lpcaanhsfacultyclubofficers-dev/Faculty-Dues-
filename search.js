import https from 'https';
https.get('https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=dolphin%20shark%20fish%20swimming%20filetype:webm&utf8=&format=json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
});
