const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { PayOS } = require('@payos/node');

const payos = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID,
  apiKey: process.env.PAYOS_API_KEY,
  checksumKey: process.env.PAYOS_CHECKSUM_KEY,
});

async function main() {
  const webhookUrl =
    'https://reita-hyperspatial-rosily.ngrok-free.dev/api/v1/payment/payos/webhook';
  try {
    const result = await payos.webhooks.confirm(webhookUrl);
    console.log('Cấu hình Webhook thành công!');
    console.log(result);
  } catch (error) {
    console.error('Lỗi khi cấu hình Webhook:', error);
  }
}

main();
