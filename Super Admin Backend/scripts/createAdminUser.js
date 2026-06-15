import dotenv from "dotenv";
import bcrypt from "bcrypt";
import db from "../config/db.js";

dotenv.config();

const name = process.argv[2] || "sk";
const email = process.argv[3] || "sk@heathrow.com";
const password = process.argv[4] || "pass";
const companyId = Number(process.argv[5] || 1);

if (!name || !email || !password) {
  console.error(
    "Usage: node scripts/createAdminUser.js <name> <email> <password> [company_id]"
  );
  process.exit(1);
}

async function main() {
  const hash = await bcrypt.hash(password, 10);

  db.query("SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM users", (err, rows) => {
    if (err) {
      console.error("Failed to compute next user id:", err);
      process.exit(1);
    }

    const nextId = rows?.[0]?.nextId;
    if (!nextId) {
      console.error("Could not determine next user id");
      process.exit(1);
    }

    const sql =
      "INSERT INTO users (id, company_id, name, email, password) VALUES (?, ?, ?, ?, ?)";

    db.query(sql, [nextId, companyId, name, email, hash], (insertErr) => {
      if (insertErr) {
        console.error("Error inserting user:", insertErr);
        process.exit(1);
      }
      console.log(
        `✅ Admin user created: id=${nextId}, company_id=${companyId}, name=${name}, email=${email}`
      );
      process.exit(0);
    });
  });
}

main().catch((e) => {
  console.error("Unexpected error:", e);
  process.exit(1);
});

