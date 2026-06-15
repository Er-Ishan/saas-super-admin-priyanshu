import db from "../config/db.js";
import moment from "moment";

const dropoff = "2026-04-30 12:00";
const return_date = "2026-05-08 12:00";
const companyId = 11;

async function simulateSearch() {
  try {
    const dropTime = String(dropoff).split(" ")[1] + ":00";
    const returnTime = String(return_date).split(" ")[1] + ":00";

    const sql = `
      SELECT *
      FROM parking_products
      WHERE
        (
          (
            operational_from <= operational_to
            AND ? BETWEEN operational_from AND operational_to
          )
          OR
          (
            operational_from > operational_to
            AND (? >= operational_from OR ? <= operational_to)
          )
        )
        AND
        (
          (
            operational_from <= operational_to
            AND ? BETWEEN operational_from AND operational_to
          )
          OR
          (
            operational_from > operational_to
            AND (? >= operational_from OR ? <= operational_to)
          )
        )
        AND is_active = 1
        AND company_id = ?
    `;

    const [results] = await db.promise().query(sql, [
      dropTime, dropTime, dropTime,
      returnTime, returnTime, returnTime,
      companyId
    ]);

    console.log("Initial Results found:", results.length);
    if (results.length === 0) {
      console.log("No products found in initial query.");
      process.exit(0);
    }

    const validProducts = [];
    for (let p of results) {
      console.log(`Checking product: ${p.product_name} (ID: ${p.id})`);
      const start = moment(dropoff, "YYYY-MM-DD HH:mm");
      const end = moment(return_date, "YYYY-MM-DD HH:mm");

      let hours = end.diff(start, "hours");
      let days = Math.ceil(hours / 24) + 1;
      const dayOfMonth = start.date();

      let bandRow = [];
      let bandMonth = moment(start);

      for (let i = 0; i < 12; i++) {
        const monthName = bandMonth.format("MMMM");
        const year = bandMonth.format("YYYY");
        console.log(`  Searching band for ${monthName} ${year} (Company ${companyId})`);

        const [rows] = await db.promise().query(
          "SELECT * FROM parking_product_price_bands WHERE product_id=? AND month=? AND year=? AND company_id=? LIMIT 1",
          [p.id, monthName, year, companyId]
        );

        if (rows.length) {
          bandRow = rows;
          console.log(`  Found band row for ${monthName}`);
          break;
        }
        bandMonth.subtract(1, "month");
      }

      if (!bandRow.length) {
        console.log(`  FAILED: No band row found for ${p.product_name}`);
        continue;
      }

      const bandName = bandRow[0][`day_${dayOfMonth}`];
      console.log(`  Band Name for day ${dayOfMonth}: ${bandName}`);

      const [priceRow] = await db.promise().query(
        "SELECT * FROM parking_product_price_global_bands WHERE product_id=? AND band_name=? AND company_id=? LIMIT 1",
        [p.id, bandName, companyId]
      );

      if (!priceRow.length) {
        console.log(`  FAILED: No global price row found for band ${bandName}`);
        continue;
      }

      const basePrice = priceRow[0][`day_${days}`] ?? priceRow[0]["day_31+"];
      console.log(`  Found price for ${days} days: ${basePrice}`);
      p.total_price = parseFloat(basePrice).toFixed(2);
      validProducts.push(p);
    }

    console.log("Final Valid Products:", validProducts.length);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

simulateSearch();
