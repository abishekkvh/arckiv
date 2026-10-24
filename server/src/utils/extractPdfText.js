// Isolated child process: malformed PDFs cannot block the HTTP event loop.
const fs = require('node:fs');
const { PDFParse } = require('pdf-parse');
(async () => {
  const parser = new PDFParse({ data: fs.readFileSync(process.argv[2]), verbosity: 0 });
  try {
    const result = await parser.getText();
    const text = result.text.slice(0, 200000);
    // Use this shortcut only when every page contains substantial digital text.
    const complete = result.pages.length > 0 && result.pages.every(page => page.text.trim().length >= 30);
    process.stdout.write(JSON.stringify({ text, complete }));
  } finally { await parser.destroy(); }
})().catch(() => { process.exitCode = 1; });
