const path = require('path');
const fs = require('fs');

module.exports = (req, res) => {
  const url = req.url.split('?')[0];

  const map = {
    '/': 'index.html',
    '/style.css': 'style.css',
    '/app.js': 'app.js',
  };

  const file = map[url];
  if (!file) { res.status(404).end('Not found'); return; }

  const filePath = path.join(process.cwd(), 'public', file);
  const ext = path.extname(file);
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' };

  try {
    const content = fs.readFileSync(filePath);
    res.setHeader('Content-Type', types[ext] || 'text/plain');
    res.setHeader('Cache-Control', 'no-cache');
    res.end(content);
  } catch(e) {
    res.status(500).end('Error: ' + e.message);
  }
};
