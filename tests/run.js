// Runs every tests/*.test.js against the app served from the repo folder.
// Usage: npm test   (needs Playwright's Chromium: npx playwright install chromium)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = path.normalize(path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath));
  if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); return res.end('not found');
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

// Run one test file without blocking, so this process keeps serving pages to the browser.
function runFile(file, base) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [file], { env: { ...process.env, BASE_URL: base }, stdio: 'inherit' });
    const timer = setTimeout(() => child.kill('SIGKILL'), 180000);
    child.on('exit', (code, signal) => { clearTimeout(timer); resolve(code === 0 ? 0 : (code ?? signal)); });
  });
}

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}/`;
  const files = fs.readdirSync(__dirname).filter((f) => f.endsWith('.test.js')).sort();
  let failed = 0;
  for (const f of files) {
    console.log(`\n=== ${f}`);
    const status = await runFile(path.join(__dirname, f), base);
    if (status !== 0) { failed++; console.log(`!!! ${f} failed (${status})`); }
  }
  server.close();
  console.log(failed ? `\n${failed} test file(s) failed` : `\nAll ${files.length} test files passed`);
  process.exit(failed ? 1 : 0);
});
