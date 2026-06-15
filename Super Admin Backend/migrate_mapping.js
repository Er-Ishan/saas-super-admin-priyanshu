import db from "./config/db.js";

const migrate = async () => {
  try {
    console.log("Checking if 'email_mapping' column exists in 'company_suppliers'...");
    
    const [columns] = await db.promise().query("SHOW COLUMNS FROM company_suppliers LIKE 'email_mapping'");
    
    if (columns.length === 0) {
      console.log("Adding 'email_mapping' column to 'company_suppliers' table...");
      await db.promise().query("ALTER TABLE company_suppliers ADD COLUMN email_mapping JSON DEFAULT NULL AFTER commission");
      console.log("✅ Successfully added 'email_mapping' column.");
    } else {
      console.log("Column 'email_mapping' already exists.");
    }

    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
};

migrate();
