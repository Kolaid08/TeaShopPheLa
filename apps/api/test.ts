import axios from 'axios';

async function run() {
  try {
    const loginRes = await axios.post('http://localhost:3001/api/v1/auth/login', {
      PINCode: '1234',
      password: '123456'
    });
    const token = loginRes.data.data.accessToken;
    console.log('Login success!');

    console.log('Calling GET /ingredients/expired...');
    const expRes = await axios.get('http://localhost:3001/api/v1/ingredients/expired?days=7', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const expiredData = expRes.data.data;
    console.log(`GET /ingredients/expired: Found ${expiredData.length} items`);
    for (const item of expiredData) {
      console.log(` - Nguyên liệu ID: ${item.IngredientID}, Lô: ${item.IngredientReceiptID}, SL còn: ${item.QuantityRemaining}, HSD: ${item.ExpirationDate}`);
    }

    if (expiredData.length > 0) {
      const target = expiredData[0];
      console.log(`\nTesting dispose for ${target.IngredientID} (Lô ${target.IngredientReceiptID}) with qty 1...`);
      const disposeRes = await axios.post('http://localhost:3001/api/v1/ingredients/dispose', [{
        IngredientReceiptID: target.IngredientReceiptID,
        IngredientID: target.IngredientID,
        Quantity: 1,
        Reason: "Test API by AI"
      }], {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Dispose result:', disposeRes.data);
    }

  } catch (err: any) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}
run();
