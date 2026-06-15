import db from "./config/db.js";

const sql = "ALTER TABLE companies ADD COLUMN email VARCHAR(255) AFTER name";

db.query(sql, (err, result) => {
  if (err) {
    if (err.code === 'ER_DUP_COLUMN_NAME') {
      console.log("Column 'email' already exists.");
    } else {
      console.error("Error adding column:", err);
    }
  } else {
    console.log("Successfully added 'email' column to 'companies' table.");
  }
  process.exit();
});
