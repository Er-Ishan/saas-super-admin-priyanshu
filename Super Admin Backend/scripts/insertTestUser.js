import db from "../config/db.js";

const query = `
  INSERT INTO users (id, company_id, name, email, password)
  VALUES (9999, 1, 'Test Admin', 'test@example.com', '$2b$10$3bX3.4Q.rAMv3MCg2oj/ve70kQ2bQua9q03z9F7JYUbDyjAE2Vc/a')
`;

db.query(query, (err) => {
    if (err) console.error("Error inserting test user:", err);
    else console.log("Test user inserted successfully.");
    process.exit();
});
