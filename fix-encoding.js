const fs = require('fs');
const path = require('path');

// Windows-1252 to byte mapping
const windows1252ToByte = new Map();
// 0x00 to 0x7F are identical
for (let i = 0; i <= 0x7F; i++) {
  windows1252ToByte.set(i, i);
}
// 0x80 to 0x9F have some special mappings
const cp1252 = [
  0x20AC, 0x81, 0x201A, 0x0192, 0x201E, 0x2026, 0x2020, 0x2021,
  0x02C6, 0x2030, 0x0160, 0x2039, 0x0152, 0x8D, 0x017D, 0x8F,
  0x90, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2013, 0x2014,
  0x02DC, 0x2122, 0x0161, 0x203A, 0x0153, 0x9D, 0x017E, 0x0178
];
for (let i = 0; i < cp1252.length; i++) {
  windows1252ToByte.set(cp1252[i], 0x80 + i);
}
// 0xA0 to 0xFF are identical
for (let i = 0xA0; i <= 0xFF; i++) {
  windows1252ToByte.set(i, i);
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Check if it seems corrupted (contains typical cp1252 corruption patterns)
      if (content.includes('à¹') || content.includes('à¸') || content.includes('à¸·')) {
        try {
          const bytes = [];
          let isCorrupted = true;
          for (let i = 0; i < content.length; i++) {
            const cp = content.charCodeAt(i);
            const b = windows1252ToByte.get(cp);
            if (b !== undefined) {
              bytes.push(b);
            } else {
              // Character not in windows-1252 map, might not be corrupted or mixed?
              // Actually, non-corrupted ASCII characters are in the map.
              // If it's outside the map, it's either an original Thai char or something else.
              // We'll just push the low byte of the character if we can't map it, but let's hope it maps.
              bytes.push(cp & 0xFF);
            }
          }
          const buffer = Buffer.from(bytes);
          const restored = buffer.toString('utf8');
          // Check if restored text has Thai
          if (/[\u0E00-\u0E7F]/.test(restored)) {
            fs.writeFileSync(fullPath, restored, 'utf8');
            console.log('Restored ' + fullPath);
          }
        } catch (e) {
          console.error('Failed to restore ' + fullPath, e);
        }
      }
    }
  }
}

walk('src');
