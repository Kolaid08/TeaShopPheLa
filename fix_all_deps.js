const fs = require('fs');
const glob = require('glob');
const files = glob.sync('**/package.json', { ignore: '**/node_modules/**' });
for (const file of files) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  let changed = false;
  
  if (data.devDependencies) {
    if (!data.dependencies) data.dependencies = {};
    for (const pkg in data.devDependencies) {
      data.dependencies[pkg] = data.devDependencies[pkg];
    }
    delete data.devDependencies;
    changed = true;
  }
  
  if (changed) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
    console.log('Moved all devDeps to deps in', file);
  }
}

