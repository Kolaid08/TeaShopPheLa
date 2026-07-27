const fs = require('fs');
const glob = require('glob');
const files = glob.sync('**/package.json', { ignore: '**/node_modules/**' });
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('"typescript": "^5.4.5"')) {
    fs.writeFileSync(file, content.replace('"typescript": "^5.4.5"', '"typescript": "5.4.5"'));
    console.log('Fixed', file);
  }
}

