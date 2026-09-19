import http from 'node:http';
import fs from 'node:fs';
const page = new URL('../rs_portrait.html', import.meta.url);
http.createServer((req, res) => {
  if (!['/', '/rs_portrait.html'].includes(req.url)) return res.writeHead(404).end();
  res.writeHead(200, {'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'no-store'});
  fs.createReadStream(page).pipe(res);
}).listen(8786, '127.0.0.1');
