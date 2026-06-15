import db from "../config/db.js";

const companyId = 1; // Assuming company 1 based on backend code

async function debugSearch() {
  try {
    const [products] = await db.promise().query(
      "SELECT id, product_name, airport_name, is_active, company_id, operational_from, operational_to FROM parking_products WHERE company_id = ?",
      [companyId]
    );

    console.log("Total Products for Company:", products.length);
    console.log(JSON.stringify(products, null, 2));

    for (const p of products) {
      const [bands] = await db.promise().query(
        "SELECT * FROM parking_product_price_bands WHERE product_id = ?",
        [p.id]
      );
      console.log(`Product ${p.id} (${p.product_name}) has ${bands.length} Price Bands.`);

      const [globalBands] = await db.promise().query(
        "SELECT * FROM parking_product_price_global_bands WHERE product_id = ?",
        [p.id]
      );
      console.log(`Product ${p.id} (${p.product_name}) has ${globalBands.length} Global Bands.`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

debugSearch();
