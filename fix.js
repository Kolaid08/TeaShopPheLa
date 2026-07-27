const fs = require('fs');

// 1. Fix backend app.ts CORS
let appTs = fs.readFileSync('apps/api/src/app.ts', 'utf8');
appTs = appTs.replace(/origin:\s*\[config\.clientUrl,\s*config\.customerClientUrl\],/g, "origin: true, // Allow all origins for Vercel preview domains");
fs.writeFileSync('apps/api/src/app.ts', appTs);

// 2. Fix backend chat.socket.ts CORS
let socketTs = fs.readFileSync('apps/api/src/modules/chat/chat.socket.ts', 'utf8');
socketTs = socketTs.replace(/origin:\s*\[config\.clientUrl,\s*config\.customerClientUrl\],/g, "origin: true,");
fs.writeFileSync('apps/api/src/modules/chat/chat.socket.ts', socketTs);

// 3. Fix seed.ts
let seedTs = fs.readFileSync('apps/api/prisma/seed.ts', 'utf8');
seedTs = seedTs.replace(/http:\/\/localhost:3001/g, 'https://teashopphela.onrender.com');
fs.writeFileSync('apps/api/prisma/seed.ts', seedTs);

// 4. Fix web chat/page.tsx
let webChat = fs.readFileSync('apps/web/src/app/(dashboard)/chat/page.tsx', 'utf8');
webChat = webChat.replace(/'http:\/\/localhost:3001\/api\/v1\//g, '`${process.env.NEXT_PUBLIC_API_URL || \'http://localhost:3001/api/v1\'}/');
fs.writeFileSync('apps/web/src/app/(dashboard)/chat/page.tsx', webChat);

console.log("All fixes applied successfully!");
