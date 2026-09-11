const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    if(fs.statSync(dirPath).isDirectory()) walkDir(dirPath, callback); else callback(dirPath);
  });
}

const fixFile = (filePath) => {
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Remove ALL instances of credentials: 'include' inside the options object
  // Let's do a more careful replace: find fetch(...), parse it, but that's hard.
  // Instead, let's just use regex to clean it up.
  content = content.replace(/credentials:\s*'include',\s*/g, '');
  content = content.replace(/,\s*credentials:\s*'include'/g, '');
  content = content.replace(/credentials:\s*'include'/g, '');
  
  // Now add it back exactly once for every fetch
  content = content.replace(/fetch\(([^,]+),\s*\{/g, "fetch($1, { credentials: 'include', ");
  // And for empty options:
  content = content.replace(/fetch\(([^,]+)\)/g, "fetch($1, { credentials: 'include' })");

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed duplicates in', filePath);
  }
};

walkDir(path.join(__dirname, 'app'), fixFile);
walkDir(path.join(__dirname, 'components'), fixFile);
walkDir(path.join(__dirname, 'hooks'), fixFile);
