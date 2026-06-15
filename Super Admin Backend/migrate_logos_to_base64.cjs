const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'parking_saas'
}).promise();

async function migrate() {
    try {
        const [rows] = await db.query("SELECT id, logo_url FROM companies WHERE logo_url IS NOT NULL AND logo_url LIKE '/assets/%'");
        console.log(`Found ${rows.length} companies to migrate`);

        for (const row of rows) {
            const relativePath = row.logo_url;
            const absolutePath = path.join(__dirname, '../ParkingBoxFrontendAdmin/public', relativePath);

            if (fs.existsSync(absolutePath)) {
                const fileData = fs.readFileSync(absolutePath);
                const mimetype = mime.lookup(absolutePath) || 'image/png';
                const base64Image = `data:${mimetype};base64,${fileData.toString('base64')}`;

                await db.query("UPDATE companies SET logo_url = ? WHERE id = ?", [base64Image, row.id]);
                console.log(`Migrated logo for company ID ${row.id}`);
            } else {
                console.warn(`File not found for company ID ${row.id}: ${absolutePath}`);
            }
        }

        console.log("Migration complete");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

migrate();
