const axios = require('axios');

async function test() {
  try {
    const res = await axios.get('http://localhost:5000/api/super-admin/suppliers');
    console.log('Suppliers:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
