const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();

// Directories to ignore
const ignoreDirs = new Set(['.git', 'node_modules', 'out', 'dist', 'build', '.claude', 'resources']);
// Extensions to process
const allowedExts = new Set(['.js', '.ts', '.jsx', '.tsx', '.json', '.html', '.css', '.md', '.cjs', '.mjs']);

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Replace variations
  content = content.replace(/Nerv/g, 'Nerv');
  content = content.replace(/Nerv/g, 'Nerv');
  content = content.replace(/Nerv/g, 'Nerv');
  content = content.replace(/nerv/g, 'nerv');
  content = content.replace(/munderdiffl\.in/g, 'nerv.in');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      if (!ignoreDirs.has(entry.name)) {
        walkDir(fullPath);
      }
    } else {
      const ext = path.extname(entry.name);
      if (allowedExts.has(ext)) {
        processFile(fullPath);
      }
    }
  }
}

console.log('Starting replacement...');
walkDir(rootDir);
console.log('Finished text replacement.');
