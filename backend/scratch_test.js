const http = require('http');
const server = http.createServer((req, res) => {
  res.end('ok');
});
server.listen(3001, () => {
  console.log('Test HTTP server listening on 3001');
});
