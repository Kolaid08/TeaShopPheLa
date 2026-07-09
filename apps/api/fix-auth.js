const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

walkDir(path.join(__dirname, 'src', 'modules'), function(filePath) {
    if (filePath.endsWith('.router.ts') || filePath.endsWith('.controller.ts')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;
        
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('requireRole(') && !lines[i].includes('verifyJWT')) {
                if (/router\.(post|put|patch|delete|get)\(/.test(lines[i])) {
                    lines[i] = lines[i].replace(/requireRole\(/, 'verifyJWT, requireRole(');
                    modified = true;
                }
            }
        }
        
        if (modified) {
            fs.writeFileSync(filePath, lines.join('\n'));
            console.log('Fixed ' + filePath);
        }
    }
});
