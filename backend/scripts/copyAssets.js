const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../src/rules/data');
const destDir = path.resolve(__dirname, '../dist/rules/data');

if (fs.existsSync(srcDir)) {
  fs.mkdirSync(destDir, { recursive: true });
  const files = fs.readdirSync(srcDir);
  for (const file of files) {
    fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
  }
  console.log(`[BUILD] Copied ${files.length} rule dataset assets to dist/rules/data.`);
}

