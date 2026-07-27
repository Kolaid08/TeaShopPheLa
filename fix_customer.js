const fs = require('fs');
const files = [
  'apps/customer/src/components/GlobalMarketingListener.tsx',
  'apps/customer/src/components/chat/ChatWidget.tsx',
  'apps/customer/src/app/history/page.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/'http:\/\/localhost:3001\/api\/v1\//g, '`${process.env.NEXT_PUBLIC_API_URL || \'http://localhost:3001/api/v1\'}/');
  fs.writeFileSync(file, content);
}
console.log("Customer files fixed");
