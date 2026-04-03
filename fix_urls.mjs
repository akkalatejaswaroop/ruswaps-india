import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const replaceAPIUrl = (filePath) => {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove the API_URL declarations
    content = content.replace(/const API_URL = process\.env\.NEXT_PUBLIC_API_URL \|\| 'http:\/\/localhost:3000';\n/g, '');
    content = content.replace(/const API_URL = process\.env\.NEXT_PUBLIC_API_URL \|\| "http:\/\/localhost:3000";\n/g, '');
    
    // Replace references using template literals
    content = content.replace(/\$\{API_URL\}\/api\//g, '/api/');
    content = content.replace(/\$\{API_URL\}/g, '');

    // In src/lib/api.ts it exports API_URL, we should remove the export too
    if (filePath.endsWith('api.ts')) {
      content = content.replace(/export \{ API_URL \};\n/g, '');
    }

    fs.writeFileSync(filePath, content, 'utf8');
  }
};

['./src/app', './src/lib'].forEach(dir => {
  if (fs.existsSync(dir)) {
    walkDir(dir, replaceAPIUrl);
  }
});

console.log('Fixed API URLs');
