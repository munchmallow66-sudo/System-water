const fs = require('fs');
const path = require('path');

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      
      // Remove any leading replacement characters or BOM
      if (content.charCodeAt(0) === 0xFFFD || content.charCodeAt(0) === 0xFEFF || content.charAt(0) === '') {
        content = content.substring(1);
        changed = true;
      }
      
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Fixed BOM/FFFD in ' + fullPath);
      }
    }
  }
}

walk('src');
