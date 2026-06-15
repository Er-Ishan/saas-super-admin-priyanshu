const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'parking_saas'
});

db.query("ALTER TABLE companies MODIFY logo_url LONGTEXT;", (err, results) => {
    if (err) {
        console.error("Error modifying table:", err);
        process.exit(1);
    }
    console.log("Successfully modified logo_url to LONGTEXT");
    process.exit(0);
});
