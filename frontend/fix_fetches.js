const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function processFile(filePath) {
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Replace literal http://localhost:5000 with dynamic API URL
  // e.g. fetch('http://localhost:5000/api/auth/login', { -> fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/login`, {
  // We'll replace the string literal if possible.
  // Actually, let's just make NEXT_PUBLIC_API_URL a standard prefix.
  const replacement = "`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/";
  
  // single quotes
  content = content.replace(/'http:\/\/localhost:5000\//g, replacement);
  // backticks
  content = content.replace(/`http:\/\/localhost:5000\//g, replacement);
  // fix trailing quote/backtick if we replaced the opening one.
  // Wait, if it was 'http://localhost:5000/api/auth/login', it becomes `${process.env...}/api/auth/login' -> syntax error!
  // Let's do a better regex:
  // fetch('http://localhost:5000/api...') -> fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api...`)
  content = content.replace(/'http:\/\/localhost:5000\/([^']*)'/g, "`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/$1`");
  
  // fetch(`http://localhost:5000/api/${id}`) -> fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/${id}`)
  content = content.replace(/`http:\/\/localhost:5000\/([^`]*)`/g, "`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/$1`");

  // Now ensure credentials: 'include' is present in fetch options.
  // A naive approach: if we see "fetch(..., {" without credentials, inject it.
  // Let's just find `fetch(` and carefully inject it.
  // Wait, I can just use a simple string replace for the ones I found:
  
  const replacements = [
    [/fetch\(([^,]+),\s*{/g, "fetch($1, { credentials: 'include',"],
    // if there's no options object at all (e.g. fetch(url))
    [/fetch\(([^,]+)\)/g, "fetch($1, { credentials: 'include' })"]
  ];

  replacements.forEach(([regex, repl]) => {
    content = content.replace(regex, repl);
  });
  
  // Clean up any double credentials (if it already had it)
  content = content.replace(/credentials:\s*'include',\s*credentials:\s*'include'/g, "credentials: 'include'");

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated', filePath);
  }
}

walkDir(path.join(__dirname, 'app'), processFile);
walkDir(path.join(__dirname, 'components'), processFile);
walkDir(path.join(__dirname, 'hooks'), processFile);
