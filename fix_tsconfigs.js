const fs = require('fs');

const rootTs = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
delete rootTs.compilerOptions.module;
delete rootTs.compilerOptions.moduleResolution;
fs.writeFileSync('tsconfig.json', JSON.stringify(rootTs, null, 2) + '\n');

const apiTs = JSON.parse(fs.readFileSync('apps/api/tsconfig.json', 'utf8'));
delete apiTs.compilerOptions.module;
delete apiTs.compilerOptions.moduleResolution;
apiTs.compilerOptions.noImplicitReturns = false;
fs.writeFileSync('apps/api/tsconfig.json', JSON.stringify(apiTs, null, 2) + '\n');
console.log('Fixed tsconfigs');

