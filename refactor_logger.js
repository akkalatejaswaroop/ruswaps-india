const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('src');
files.forEach(file => {
  if (file === path.join('src', 'lib', 'logger.ts') || file === 'src/lib/logger.ts') return;
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('console.error(')) {
    content = content.replace(/console\.error\(/g, 'logger.error(');
    
    if (!content.includes('import { logger }')) {
      const importStmt = "import { logger } from '@/lib/logger';\n";
      const lastImportIndex = content.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
        const endOfLine = content.indexOf('\n', lastImportIndex);
        content = content.slice(0, endOfLine + 1) + importStmt + content.slice(endOfLine + 1);
      } else {
        if (content.startsWith('"use client"') || content.startsWith("'use client'")) {
          const firstLineEnd = content.indexOf('\n');
          content = content.slice(0, firstLineEnd + 1) + importStmt + content.slice(firstLineEnd + 1);
        } else {
          content = importStmt + content;
        }
      }
    }
    fs.writeFileSync(file, content);
  }
});
console.log('Done');
