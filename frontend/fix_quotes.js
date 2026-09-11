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

  content = content.replace(/\/api\/([^']*)', \{/g, "/api/$1`, {");
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed', filePath);
  }
};

walkDir(path.join(__dirname, 'app'), fixFile);
walkDir(path.join(__dirname, 'components'), fixFile);
walkDir(path.join(__dirname, 'hooks'), fixFile);
