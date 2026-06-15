import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  
  try {
    console.log('--- Starting Migration: Multiple Sender Emails ---');
    
    // 1. Alter column to TEXT first to allow invalid JSON during migration
    console.log('Altering column to TEXT...');
    await connection.query(`
      ALTER TABLE company_suppliers 
      MODIFY COLUMN supplier_from_email TEXT NOT NULL
    `);
    
    // 2. Fetch all rows to see what needs migration
    const [rows] = await connection.query('SELECT id, supplier_from_email FROM company_suppliers');
    
    for (const row of rows) {
      let current = row.supplier_from_email.trim();
      let migrated = current;
      
      // If it's not already a JSON array, convert it
      if (!current.startsWith('[') && !current.startsWith('{')) {
        migrated = JSON.stringify([current]);
        console.log(`Migrating ID ${row.id}: ${current} -> ${migrated}`);
        await connection.query('UPDATE company_suppliers SET supplier_from_email = ? WHERE id = ?', [migrated, row.id]);
      }
    }
    
    // 3. Add the JSON validation check
    console.log('Adding JSON validation check...');
    await connection.query(`
      ALTER TABLE company_suppliers 
      MODIFY COLUMN supplier_from_email longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL 
      CHECK (json_valid(supplier_from_email))
    `);
    
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
