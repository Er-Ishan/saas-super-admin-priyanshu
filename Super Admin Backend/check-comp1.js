import db from "./config/db.js";

async function checkComp1() {
  try {
    const [rows] = await db.promise().query(
      "SELECT COUNT(*) as count FROM parking_bookings WHERE company_id = 1 AND (DATE(drop_off_date) BETWEEN '2026-03-01' AND '2026-05-29')"
    );
    console.log(`Company 1 has ${rows[0].count} records in range`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkComp1();
