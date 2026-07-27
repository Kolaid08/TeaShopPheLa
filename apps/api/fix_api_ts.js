const fs = require('fs');
const apiTs = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
apiTs.compilerOptions.module = 'Node16';
apiTs.compilerOptions.moduleResolution = 'Node16';
fs.writeFileSync('tsconfig.json', JSON.stringify(apiTs, null, 2) + '\n');

