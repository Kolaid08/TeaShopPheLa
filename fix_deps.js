const fs = require('fs');
const glob = require('glob');
const files = glob.sync('**/package.json', { ignore: '**/node_modules/**' });
for (const file of files) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  let changed = false;
  
  if (!data.dependencies) data.dependencies = {};
  
  if (data.devDependencies && data.devDependencies.typescript) {
    data.dependencies.typescript = data.devDependencies.typescript;
    delete data.devDependencies.typescript;
    changed = true;
  }
  
  if (data.devDependencies && data.devDependencies.prisma) {
    data.dependencies.prisma = data.devDependencies.prisma;
    delete data.devDependencies.prisma;
    changed = true;
  }
  
  if (changed) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
    console.log('Fixed dependencies in', file);
  }
}

