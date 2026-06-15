const axios = require('axios');
axios.get('http://localhost:9000/api/superadmin/companies/3')
    .then(res => {
        const logo = res.data.data.logo_url;
        console.log('Logo Start:', logo.substring(0, 100));
        console.log('Logo End:', logo.substring(logo.length - 20));
        console.log('Total Length:', logo.length);
    })
    .catch(err => {
        console.error('Error:', err.message);
    });
